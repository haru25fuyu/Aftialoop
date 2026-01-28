import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "../conf/api";
import { Avatar } from "./Avatar"; // 前回作ったやつ

type Message = {
    id: number;
    user_id: string;
    message: string;
    created_at: string;
    user_name: string;
    user_icon_url: string;
};

type Props = {
    purchase_request_id: string;
    myUserId: string; // 自分のID (左右の出し分け用)
};

export const TransactionChat: React.FC<Props> = ({ purchase_request_id, myUserId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);

    // 自動スクロール用
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const fetchMessages = useCallback(async () => {
        try {
            const res = await api.get(`/flea-market/transactions/${purchase_request_id}/messages`);
            setMessages(res.data);
        } catch (error) {
            console.error(error);
        }
    }, [purchase_request_id]); // この関数が使う変数を依存配列に入れる

    useEffect(() => {
        fetchMessages();
        // 簡易的なポーリング（5秒ごとに更新）を入れるとリアルタイムっぽくなります
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    // メッセージが増えたら一番下にスクロール
    useEffect(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            // 枠の「中身の高さ(scrollHeight)」までスクロールさせる
            container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim()) return;
        setSending(true);
        try {
            await api.post(`/flea-market/transactions/${purchase_request_id}/messages`, {
                message: inputText
            });
            setInputText("");
            fetchMessages(); // すぐに再取得
        } catch (error) {
            alert("送信に失敗しました");
            console.error(error);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[320px]">
            <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">
                取引メッセージ
            </div>

            {/* メッセージ表示エリア */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
            >
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 text-sm mt-10">
                        まだメッセージはありません。<br />挨拶を送ってみましょう！
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.user_id === myUserId;
                    return (
                        <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                            {/* アイコン */}
                            <Avatar
                                src={msg.user_icon_url}
                                name={msg.user_name}
                                className="w-10 h-10 border shadow-sm"
                            />

                            {/* 吹き出し */}
                            <div className={`max-w-[70%] space-y-1 ${isMe ? "items-end flex flex-col" : "items-start flex flex-col"}`}>
                                <div className="text-xs text-gray-500 mb-1">
                                    {isMe ? "あなた" : msg.user_name} • {new Date(msg.created_at).toLocaleString()}
                                </div>
                                <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${isMe
                                    ? "bg-emerald-600 text-white rounded-tr-none"
                                    : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                                    }`}>
                                    {msg.message}
                                </div>
                            </div>
                        </div>
                    );
                })}

            </div>

            {/* 入力エリア */}
            <div className="p-4 bg-white border-t border-gray-100 ">
                <div className="flex gap-2 mx-auto">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="取引メッセージを入力..."
                        className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none text-sm"
                        rows={1}
                        disabled={sending}
                    />
                    <button
                        onClick={handleSend}
                        disabled={sending || !inputText.trim()}
                        className={`px-4 rounded-xl font-bold text-white transition-all ${sending || !inputText.trim()
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-700 shadow-md"
                            }`}
                    >
                        送信
                    </button>
                </div>
            </div>
        </div>
    );
};