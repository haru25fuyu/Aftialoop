import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { FleaContent, FleaComment } from "../types/FleaMarket";
import api from "../conf/api";
import CommentList from "../component/CommentList";
import { Avatar } from "../component/Avatar";
import { s } from "../styles/modal/QuestionModal.styles";

type MappedComment = {
  id: string; // ← string に変更
  userId: string;
  userName: string;
  userIcon: string;
  body: string;
  createdAt: number;
};

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
  const [comments, setComments] = useState<MappedComment[]>([]);
  const [draft, setDraft] = useState("");
  const [isReloading, setIsReloading] = useState(false);
  const [reloadError, setReloadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bodyOverflowRef = useRef<string>("");

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
  }, [comments, isOpen]);

  const loadMessages = useCallback(async () => {
    if (!item?.id) return;
    setIsReloading(true);
    setReloadError(null);
    try {
      const res = await api.get(`/flea-market/item/${item.id}/messages`);
      const list = res.data?.messages ?? [];
      setComments(
        list.map((m: FleaComment) => ({
          id: String(m.id),
          itemId: m.itemId,
          parentMessageId: m.parentMessageId,
          userId: m.userId,
          userName: m.userName,
          userIcon: m.userIcon,
          body: m.body,
          createdAt: Number(m.createdAt) || Date.now(),
        })),
      );
    } catch (e) {
      setReloadError(e instanceof Error ? e.message : "取得失敗");
    } finally {
      setIsReloading(false);
    }
  }, [item?.id]);

  useEffect(() => {
    if (isOpen && item) loadMessages();
  }, [isOpen, item?.id]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !item) return;
    setIsSending(true);
    setDraft("");
    try {
      await api.post("/items/question", { itemId: item.id, text });
      await loadMessages();
    } catch {
      setDraft(text);
    } finally {
      setIsSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
    }
  };

  if (!isOpen || !item) return null;

  return createPortal(
    <div
      style={s.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={s.card}>
        {/* ヘッダー */}
        <div style={s.header}>
          <div style={{ position: "relative" }}>
            <Avatar
              src={item.seller_icon_url}
              name={item.seller_name}
              size={40}
            />
            <span
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: shopOnline ? "#3a7a22" : "#c4c1bb",
                border: "2px solid #fff",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {roomTitle}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#8c8c8c",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {roomSubtitle}
            </div>
            {reloadError && (
              <div style={{ fontSize: 12, color: "#d63c20", marginTop: 2 }}>
                {reloadError}
              </div>
            )}
          </div>
          <button
            aria-label="reload"
            onClick={() => void loadMessages()}
            disabled={isReloading}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#8c8c8c",
              padding: "0 8px",
              fontSize: 18,
            }}
          >
            {isReloading ? "…" : "↻"}
          </button>
          <button
            aria-label="close"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#8c8c8c",
              fontSize: 20,
            }}
          >
            ✕
          </button>
        </div>
        {/* メッセージ */}
        <div ref={scrollRef} style={s.messages}>
          <CommentList comments={comments} sellerId={item?.userId} />
        </div>
        {/* 入力 */}
        <div style={s.inputArea}>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="質問・コメントを入力…"
            rows={2}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e0ddd8",
              fontSize: 14,
              fontFamily: "inherit",
              resize: "none",
              outline: "none",
            }}
          />
          <button
            onClick={send}
            disabled={!draft.trim() || isSending}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              backgroundColor: draft.trim() ? "#1a1a1a" : "#e0ddd8",
              color: draft.trim() ? "#fff" : "#8c8c8c",
              border: "none",
              fontWeight: 700,
              cursor: draft.trim() ? "pointer" : "not-allowed",
              flexShrink: 0,
            }}
          >
            送信
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
