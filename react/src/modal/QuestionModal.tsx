import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
// import { jwtDecode } from "jwt-decode"; // 未使用なら消してOK

import { FleaContent,FleaComment } from "../types/FleaMarket";

import api from "../conf/api";

import CommentList from "../component/CommentList";
import { loadUserProfile } from "../conf/function";
import { Avatar } from "../component/Avatar";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSend: (text: string) => Promise<void> | void;

    item: FleaContent | null;

    roomTitle?: string;
    roomSubtitle?: string;
    shopAvatarUrl?: string;
    shopOnline?: boolean;
};

export default function QuestionModal({
    isOpen,
    onClose,
    item,
    roomTitle = "ショップ",
    roomSubtitle = "オンライン",
    shopOnline = true,
}: Props) {
    const [comments, setComments] = useState<FleaComment[]>([]);
    const [draft, setDraft] = useState("");
    const [isReloading, setIsReloading] = useState(false);
    const [reloadError, setReloadError] = useState<string | null>(null);

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

    // 自動スクロール
    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            if (!scrollRef.current) return;
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
            });
        });
    };

    useEffect(() => {
        if (!isOpen) return;
        scrollToBottom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comments, isOpen]);

    // ✅ 履歴ロードを関数化（リロードボタンからも呼べる）
    const loadMessages = useCallback(async () => {
        if (!item?.id) return;
        setIsReloading(true);
        setReloadError(null);

        try {
            const res = await api.get(`/flea-market/item/${item.id}/messages`);
            const list = res.data?.messages ?? [];

            const mapped: FleaComment[] = list.map((m: FleaComment) => ({
                id: String(m.id),
                itemId: m.itemId,
                parentMessageId: m.parentMessageId,
                userId: m.userId,
                userName: m.userName,
                userIcon: m.userIcon,
                body: m.body,
                createdAt: Number(m.createdAt) || Date.now(),
            }));

            setComments(mapped);
        } catch (err) {
            console.error("failed to load messages", err);
            setReloadError("更新に失敗しました");
        } finally {
            setIsReloading(false);
        }
    }, [item?.id]);

    // 初回表示・item切替で履歴ロード
    useEffect(() => {
        if (!isOpen) return;
        setComments([]);
        void loadMessages();
    }, [isOpen, item?.id, loadMessages]);

    // ESCで閉じる
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    // 送信
    const send = async () => {
        const text = draft.trim();
        if (!text) return;

        try {
            const res = await api.post(`/flea-market/item/${item?.id}/messages`, {
                parentMessageId: null,
                body: text,
            });

            const userProfile = loadUserProfile();

            const newMessage: FleaComment = {
                id: res.data.id,
                itemId: item?.id || 0,
                parentMessageId: null,
                userId: res.data.userId,
                body: res.data.body,
                userIcon: userProfile?.iconUrl || "",
                userName: userProfile?.name || "",
                createdAt: res.data.createdAt || Date.now(),
            };

            setComments((m) => [...m, newMessage]);
            setDraft("");
        } catch (err) {
            console.error("send failed", err);
            setComments((m) => [
                ...m,
                {
                    id: 0,
                    itemId: item?.id || 0,
                    parentMessageId: null,
                    userId: "system",
                    body: "メッセージの送信に失敗しました。",
                    userIcon: "",
                    userName: "システム",
                    createdAt: Date.now(),
                },
            ]);
        }
    };

    // Enter送信 / Shift+Enter改行
    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            // void send();
        }
    };

    if (!isOpen) return null;
    if (!item) return null;

    return createPortal(
        <div
            aria-modal="true"
            role="dialog"
            className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/40"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full md:w-[720px] bg-white rounded-t-2xl md:rounded-2xl shadow-xl h-[90vh] flex flex-col">
                {/* ヘッダー：チャットルーム風 */}
                <div className="px-4 py-3 border-b flex items-center gap-3">
                    <div className="relative">
                        <Avatar src={item.seller_icon_url} name={item.seller_name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <span
                            className={`absolute -bottom-0 -right-0 w-3 h-3 rounded-full border-2 border-white ${shopOnline ? "bg-green-500" : "bg-gray-300"
                                }`}
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{roomTitle}</div>
                        <div className="text-xs text-gray-500 truncate">{roomSubtitle}</div>
                        {reloadError && (
                            <div className="text-xs text-red-500 mt-0.5">{reloadError}</div>
                        )}
                    </div>

                    {/* ✅ リロードボタン */}
                    <button
                        aria-label="reload"
                        title="更新"
                        onClick={() => void loadMessages()}
                        disabled={isReloading}
                        className="text-gray-500 hover:text-gray-700 disabled:opacity-50 px-2"
                    >
                        {isReloading ? "…" : "↻"}
                    </button>

                    <button
                        aria-label="close"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {/* メッセージエリア */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50 px-2">
                    <CommentList comments={comments} sellerId={item?.userId ? item.userId : ""} />
                </div>

                {/* 入力バー */}
                <div className="p-3 border-t bg-white">
                    <div className="flex items-end gap-2">
                        <textarea
                            ref={inputRef}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={onKeyDown}
                            rows={1}
                            placeholder="メッセージを入力"
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
