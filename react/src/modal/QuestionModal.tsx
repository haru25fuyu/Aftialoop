import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ChatMessage = {
    id: string;
    role: "user" | "shop";
    text: string;
    createdAt?: number; // ms
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSend: (text: string) => Promise<void> | void;

    // ルームUI用
    roomTitle?: string;          // 例: ショップ名 or 商品名
    roomSubtitle?: string;       // 例: "通常1営業日以内に返信"
    shopAvatarUrl?: string;      // 左上アイコン
    shopOnline?: boolean;        // オンラインドット表示

    initialMessages?: ChatMessage[];
};

export default function QuestionModal({
    isOpen,
    onClose,
    onSend,
    roomTitle = "ショップ",
    roomSubtitle = "オンライン",
    shopAvatarUrl,
    shopOnline = true,
    initialMessages = [],
}: Props) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [draft, setDraft] = useState("");
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const bodyOverflowRef = useRef<string>("");

    // bodyスクロールロック・初期フォーカス
    useEffect(() => {
        if (!isOpen) return;
        bodyOverflowRef.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const t = setTimeout(() => inputRef.current?.focus(), 0);
        return () => {
            document.body.style.overflow = bodyOverflowRef.current;
            clearTimeout(t);
        };
    }, [isOpen]);

    // ESCで閉じる
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    // 自動スクロール
    const scrollToBottom = () => {
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
    };
    useEffect(() => {
        if (!isOpen) return;
        scrollToBottom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, isOpen]);

    // 送信
    const send = async () => {
        const text = draft.trim();
        if (!text) return;
        const optimistic: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            text,
            createdAt: Date.now(),
        };
        setMessages((m) => [...m, optimistic]);
        setDraft("");
        try {
            await onSend(text);
            // ここでショップ側の自動応答を差し込みたい場合は親側で messages を渡す設計に変えるか、イベント受信で setMessages を呼ぶ
        } catch {
            setMessages((m) => [
                ...m,
                { id: crypto.randomUUID(), role: "shop", text: "送信に失敗しました。時間をおいて再度お試しください。", createdAt: Date.now() },
            ]);
        }
    };

    // Enter送信 / Shift+Enter改行
    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send();
        }
    };

    // 日付区切り用にグルーピング
    const groups = useMemo(() => {
        const byDay: { date: string; items: ChatMessage[] }[] = [];
        const fmt = (t: number) => new Date(t).toLocaleDateString();
        const src = messages.length ? messages : [];
        src.forEach((msg) => {
            const d = fmt(msg.createdAt ?? Date.now());
            const last = byDay[byDay.length - 1];
            if (!last || last.date !== d) byDay.push({ date: d, items: [msg] });
            else last.items.push(msg);
        });
        return byDay;
    }, [messages]);

    if (!isOpen) return null;

    return createPortal(
        <div
            aria-modal="true"
            role="dialog"
            className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/40"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full md:w-[720px] bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-h-[92vh] flex flex-col">
                {/* ヘッダー：チャットルーム風 */}
                <div className="px-4 py-3 border-b flex items-center gap-3">
                    <div className="relative">
                        <img
                            src={shopAvatarUrl || "https://dummyimage.com/64x64/eee/aaa&text=店"}
                            alt="shop avatar"
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <span className={`absolute -bottom-0 -right-0 w-3 h-3 rounded-full border-2 border-white ${shopOnline ? "bg-green-500" : "bg-gray-300"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{roomTitle}</div>
                        <div className="text-xs text-gray-500 truncate">{roomSubtitle}</div>
                    </div>
                    <button
                        aria-label="close"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {/* メッセージエリア */}
                <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-4 bg-gray-50">
                    {groups.length === 0 && (
                        <div className="text-sm text-gray-500 text-center mt-8">
                            商品について気になる点をお気軽にどうぞ。スタッフが順次お返事します。
                        </div>
                    )}

                    {groups.map((g) => (
                        <div key={g.date} className="mb-4">
                            {/* 日付チップ */}
                            <div className="text-[11px] text-gray-500 text-center mb-3">
                                <span className="px-3 py-1 bg-gray-200 rounded-full">{g.date}</span>
                            </div>
                            {g.items.map((m) => {
                                const time = new Date(m.createdAt ?? Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                                const isUser = m.role === "user";
                                return (
                                    <div key={m.id} className={`mb-2 flex ${isUser ? "justify-end" : "justify-start"}`}>
                                        {!isUser && (
                                            <img
                                                src={shopAvatarUrl || "https://dummyimage.com/40x40/eee/aaa&text=店"}
                                                alt="avatar"
                                                className="w-7 h-7 rounded-full mr-2 self-end"
                                            />
                                        )}
                                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${isUser
                                                ? "bg-blue-500 text-white rounded-br-sm"
                                                : "bg-white text-gray-900 border rounded-bl-sm"
                                            }`}>
                                            <div className="whitespace-pre-wrap break-words">{m.text}</div>
                                            <div className={`text-[10px] mt-1 ${isUser ? "text-blue-100" : "text-gray-400"}`}>{time}</div>
                                        </div>
                                        {isUser && <div className="w-7 ml-2" />}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* 入力バー */}
                <div className="p-3 border-t bg-white">
                    <div className="flex items-end gap-2">
                        {/* （必要なら）絵文字ボタンや画像添付ボタンをここに追加 */}
                        <textarea
                            ref={inputRef}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={onKeyDown}
                            rows={1}
                            placeholder="メッセージを入力（Enterで送信 / Shift+Enterで改行）"
                            className="flex-1 border rounded-xl px-3 py-2 h-11 max-h-32 outline-none resize-none"
                        />
                        <button
                            onClick={send}
                            disabled={!draft.trim()}
                            className="h-11 px-4 rounded-xl bg-black text-white disabled:opacity-50"
                        >
                            送信
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
