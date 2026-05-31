import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Heart, Package } from "lucide-react";
import { Header } from "../../component/Header";
import { LikeButton } from "../../component/LikeButton";
import api from "../../conf/api";
import { CONFIG } from "../../conf/config";
import { s } from "../../styles/page/mypage/LikeListPage.styles";

interface LikedItem {
  id: number;
  name: string;
  price: number;
  main_image_url: string;
  seller_name: string;
  is_liked: boolean;
}

export default function LikeListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LikedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore)
          setOffset((prev) => prev + limit);
      });
      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, hasMore],
  );

  useEffect(() => {
    const fetch = async () => {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await api.get(
          `/mypage/likes?limit=${limit}&offset=${offset}`,
        );
        const newItems = res.data || [];
        setItems((prev) => {
          const ids = new Set(prev.map((i) => i.id));
          return [
            ...prev,
            ...newItems.filter((i: LikedItem) => !ids.has(i.id)),
          ];
        });
        if (newItems.length < limit) setHasMore(false);
      } catch {
         /* ignore */
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    fetch();
  }, [offset]);

  return (
    <div style={s.page}>
      <Header />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              borderRadius: "50%",
            }}
          >
            <ChevronLeft size={24} />
          </button>
          <Heart size={20} style={{ color: "#d63c20" }} />
          <h1 style={s.title}>いいね！した商品</h1>
        </div>
        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
            読み込み中...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: 80,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                backgroundColor: "#f0eeeb",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Package size={32} style={{ color: "#8c8c8c" }} />
            </div>
            <p style={{ color: "#8c8c8c", fontWeight: 700 }}>
              いいねした商品はありません
            </p>
          </div>
        )}
        <div style={s.grid}>
          {items.map((item, i) => (
            <div
              key={item.id}
              ref={i === items.length - 1 ? lastElementRef : null}
              style={{ position: "relative" }}
            >
              <a
                href={`/flea-market/item/${item.id}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  border: "1px solid #e0ddd8",
                  overflow: "hidden",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    aspectRatio: "1",
                    overflow: "hidden",
                    backgroundColor: "#f0eeeb",
                    position: "relative",
                  }}
                >
                  {item.main_image_url && (
                    <img
                      src={CONFIG.BASE_URL + item.main_image_url}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div style={{ position: "absolute", bottom: 8, right: 8 }}>
                    <LikeButton
                      itemId={item.id}
                      initialLiked={item.is_liked}
                      size={20}
                    />
                  </div>
                </div>
                <div style={{ padding: 8 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#1a1a1a",
                      marginBottom: 4,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    ¥{item.price.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: "#8c8c8c", marginTop: 2 }}>
                    {item.seller_name}
                  </div>
                </div>
              </a>
            </div>
          ))}
        </div>
        {loadingMore && (
          <div style={{ textAlign: "center", padding: 20, color: "#8c8c8c" }}>
            読み込み中...
          </div>
        )}
      </div>
    </div>
  );
}
