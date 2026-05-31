import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Package, ShoppingBag } from "lucide-react";
import { Header } from "../../component/Header";
import api from "../../conf/api";
import { CONFIG } from "../../conf/config";
import { s } from "../../styles/page/mypage/HistoryPage.styles";

interface HistoryItem {
  id: number;
  type: "flea" | "ec";
  item_name?: string;
  first_item_name?: string;
  item_count?: number;
  item_image_url?: string;
  price?: number;
  total_amount?: number;
  status: string;
  created_at: string;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "flea" | "ec">("all");
  const limit = 20;

  const observer = useRef<IntersectionObserver | null>(null);
  const lastRef = useCallback(
    (node: HTMLAnchorElement | null) => {
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
          `/mypage/transactions/history?limit=${limit}&offset=${offset}`,
        );
        const newItems = res.data.items || [];
        setItems((prev) => {
          const ids = new Set(prev.map((i) => i.id + i.type));
          return offset === 0
            ? newItems
            : [
                ...prev,
                ...newItems.filter((i: HistoryItem) => !ids.has(i.id + i.type)),
              ];
        });
        if (newItems.length < limit) setHasMore(false);
      } catch {
        console.log();
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    fetch();
  }, [offset]);

  const displayItems = items.filter((item) =>
    activeTab === "all" ? true : item.type === activeTab,
  );

  return (
    <>
      <Header />
      <div style={s.page}>
        <div style={s.header}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 16px",
              height: 56,
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
            <h1 style={s.title}>購入した商品・取引履歴</h1>
          </div>
          <div style={s.tabs}>
            {[
              ["all", "すべて"],
              ["flea", "フリマ"],
              ["ec", "公式ストア"],
            ].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as "all" | "flea" | "ec")}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: activeTab === tab ? "#1a1a1a" : "#8c8c8c",
                  borderBottom:
                    activeTab === tab
                      ? "2px solid #1a1a1a"
                      : "2px solid transparent",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={s.content}>
          {loading ? (
            <div style={{ padding: 80, textAlign: "center", color: "#8c8c8c" }}>
              読み込み中...
            </div>
          ) : displayItems.length === 0 ? (
            <div
              style={{
                padding: 80,
                textAlign: "center",
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
                履歴はありません
              </p>
            </div>
          ) : (
            <div style={s.grid}>
              {displayItems.map((item, i) => {
                if (item.type === "flea")
                  return (
                    <Link
                      key={`flea-${item.id}`}
                      ref={i === displayItems.length - 1 ? lastRef : null}
                      to={`/flea-market/transactions/${item.id}`}
                      style={s.item}
                    >
                      <div style={s.imgWrap}>
                        {item.item_image_url ? (
                          <img
                            src={CONFIG.BASE_URL + item.item_image_url}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Package size={24} style={{ color: "#c4c1bb" }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: "#1a1a1a",
                            marginBottom: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.item_name}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>
                          ¥{(item.price || 0).toLocaleString()}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#3a7a22",
                            backgroundColor: "#f0fae8",
                            padding: "2px 8px",
                            borderRadius: 9999,
                            display: "inline-block",
                          }}
                        >
                          フリマ
                        </div>
                      </div>
                    </Link>
                  );
                return (
                  <Link
                    key={`ec-${item.id}`}
                    ref={i === displayItems.length - 1 ? lastRef : null}
                    to={`/orders/${item.id}`}
                    style={s.item}
                  >
                    <div style={s.imgWrap}>
                      {item.item_image_url ? (
                        <img
                          src={CONFIG.BASE_URL + item.item_image_url}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Package size={24} style={{ color: "#c4c1bb" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#1a1a1a",
                          marginBottom: 4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.first_item_name}
                      </div>
                      {(item.item_count || 0) > 1 && (
                        <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                          他 {item.item_count! - 1} 点
                        </div>
                      )}
                      <div style={{ fontWeight: 700, fontSize: 18 }}>
                        ¥{(item.total_amount || 0).toLocaleString()}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#3a7a22",
                          backgroundColor: "#f0fae8",
                          padding: "2px 8px",
                          borderRadius: 9999,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <ShoppingBag size={12} />
                        公式ストア
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {loadingMore && (
            <div style={{ padding: 20, textAlign: "center", color: "#8c8c8c" }}>
              読み込み中...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
