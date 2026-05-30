import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Bell, Info, MessageCircle, ShoppingBag } from "lucide-react";
import { Header } from "../component/Header";
import api from "../conf/api";
import { s } from "../styles/page/Notifications.styles";

type Notification = { id: number; type: "OFFICIAL" | "TRANSACTION" | "COMMENT"; title: string; body: string; url: string; is_read: boolean; created_at: string; };

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "OFFICIAL" | "PERSONAL">("ALL");
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 20;

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLAnchorElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMore) setOffset(prev => prev + limit); });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  useEffect(() => {
    const fetch = async () => {
      if (offset === 0) setLoading(true); else setLoadingMore(true);
      try {
        const res = await api.get(`/notifications?limit=${limit}&offset=${offset}`);
        const newItems = res.data.items || [];
        setItems(prev => { const exists = new Set(prev.map(i => i.id)); const filtered = newItems.filter((i: Notification) => !exists.has(i.id)); return offset === 0 ? newItems : [...prev, ...filtered]; });
        if (newItems.length < limit) setHasMore(false);
      } catch { } finally { setLoading(false); setLoadingMore(false); }
    };
    fetch();
  }, [offset]);

  const displayItems = items.filter(item => filter === "ALL" ? true : filter === "OFFICIAL" ? item.type === "OFFICIAL" : item.type !== "OFFICIAL");

  const getIcon = (type: string) => {
    if (type === "OFFICIAL") return <Info size={20} style={{ color: "#1a5adc" }} />;
    if (type === "TRANSACTION") return <ShoppingBag size={20} style={{ color: "#3a7a22" }} />;
    if (type === "COMMENT") return <MessageCircle size={20} style={{ color: "#b85c00" }} />;
    return <Bell size={20} style={{ color: "#8c8c8c" }} />;
  };

  return (
    <div style={s.page}>
      <Header />
      <div style={{ maxWidth: 512, margin: "0 auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
          <Bell size={24} style={{ color: "#3a7a22" }} /> お知らせ
        </h1>
        <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #e0ddd8", paddingBottom: 4 }}>
          {[["ALL", "すべて"], ["PERSONAL", "あなたへ"], ["OFFICIAL", "運営より"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val as any)} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 700, borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", backgroundColor: "transparent", color: filter === val ? "#3a7a22" : "#8c8c8c", borderBottom: filter === val ? "2px solid #3a7a22" : "2px solid transparent" }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? <div style={{ padding: 40, textAlign: "center", color: "#8c8c8c" }}>読み込み中...</div> :
            displayItems.map((item, index) => (
              <Link to={item.url} key={item.id} ref={index === displayItems.length - 1 ? lastElementRef : null}
                style={s.item(item.is_read)}>
                <div style={s.iconWrap}>{getIcon(item.type)}</div>
                <div style={s.body}>
                  <div style={s.bodyTitle}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "#5c5a56", marginTop: 2 }}>{item.body}</div>
                  <div style={s.bodyDate}>{new Date(item.created_at).toLocaleDateString()}</div>
                </div>
                {!item.is_read && <div style={s.unreadDot} />}
              </Link>
            ))
          }
          {loadingMore && <div style={{ padding: 20, textAlign: "center", color: "#8c8c8c" }}>読み込み中...</div>}
        </div>
      </div>
    </div>
  );
}
