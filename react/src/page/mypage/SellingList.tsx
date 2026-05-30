import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Tag } from "lucide-react";
import { Header } from "../../component/Header";
import api from "../../conf/api";
import { ListingItem } from "../../types/FleaMarket";
import { CONFIG } from "../../conf/config";
import { s } from "../../styles/page/mypage/SellingList.styles";

const statusBadge: Record<number, { label: string; color: string }> = {
  0: { label: "下書き", color: "#7a3fa0" }, 1: { label: "出品中", color: "#1a5adc" },
  2: { label: "取引中", color: "#b85c00" }, 3: { label: "売却済", color: "#5c5a56" }, 4: { label: "出品取り消し", color: "#d63c20" },
};

export default function SellingListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
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
        const res = await api.get(`/flea-market/selling/list?limit=${limit}&offset=${offset}`);
        const newItems = res.data.items || [];
        setItems(prev => { const ids = new Set(prev.map(i => i.id)); return [...prev, ...newItems.filter((i: ListingItem) => !ids.has(i.id))]; });
        if (newItems.length < limit) setHasMore(false);
      } catch (e) { console.error(e); } finally { setLoading(false); setLoadingMore(false); }
    };
    fetch();
  }, [offset]);

  return (
    <div style={s.page}>
      <Header />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 24 }}>
          <button onClick={() => navigate(-1)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", borderRadius: "50%" }}><ChevronLeft size={24} /></button>
          <Tag size={20} style={{ color: "#1a5adc" }} />
          <h1 style={s.title}>出品した商品</h1>
        </div>
        {loading && <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>読み込み中...</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map((item, index) => {
            const badge = statusBadge[item.status] || { label: "不明", color: "#8c8c8c" };
            return (
              <Link key={item.id} ref={index === items.length - 1 ? lastElementRef : null} to={`/flea-market/item/${item.id}`}
                style={{ display: "flex", gap: 12, backgroundColor: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e0ddd8", textDecoration: "none" }}>
                <div style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", flexShrink: 0, backgroundColor: "#f0eeeb" }}>
                  {item.main_image_url && <img src={CONFIG.BASE_URL + item.main_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{item.name}</div>
                  <div style={{ fontWeight: 700, color: "#1a1a1a", fontSize: 16, marginBottom: 8 }}>¥{item.price.toLocaleString()}</div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: badge.color, backgroundColor: badge.color + "20", padding: "2px 8px", borderRadius: 9999 }}>{badge.label}</span>
                </div>
              </Link>
            );
          })}
          {loadingMore && <div style={{ textAlign: "center", padding: 20, color: "#8c8c8c" }}>読み込み中...</div>}
        </div>
      </div>
    </div>
  );
}