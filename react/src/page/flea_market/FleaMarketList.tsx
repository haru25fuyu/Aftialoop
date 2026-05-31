import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import Header from "../../component/Header";
import api, { getAccessToken } from "../../conf/api";
import { CONFIG } from "../../conf/config";
import { LikeButton } from "../../component/LikeButton";

import { s } from "../../styles/page/flea_market/FleaMarketList.styles";

type FleaListContent = {
  id: number;
  name: string;
  price: number;
  main_image_url: string | null;
  seller_icon_url: string | null;
  seller_name: string;
  seller_rate?: number;
  quantity: number;
  shipping_fee_type: number;
  is_liked: boolean;
};
type Customer = { point: number };
const DEFAULT_RATE = 1.0;
function safeRate(v: number | null | undefined): number {
  const n = Number(v);
  return !Number.isFinite(n) || n <= 0 ? DEFAULT_RATE : n;
}
function normalizeRate(rawRate: number, den: number) {
  return rawRate > 2.0
    ? { num: Math.round(rawRate), den }
    : { num: Math.round(rawRate * den), den };
}
function calcRateDiscount(
  priceYen: number,
  userPoint: number,
  rawRate: number,
  rateDen: number,
) {
  const price = Math.floor(priceYen);
  const point = Math.floor(userPoint);
  const { num: scaledRate, den } = normalizeRate(rawRate, rateDen);
  if (scaledRate <= den) return { discountYen: 0 };
  const needPt = Math.floor((price * den) / scaledRate);
  const usePt = Math.min(point, needPt);
  const coveredYen =
    usePt >= needPt
      ? price
      : Math.min(Math.floor((usePt * scaledRate) / den), price);
  return { discountYen: Math.max(0, coveredYen - usePt) };
}

const FleaMarketList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [contents, setContents] = useState<FleaListContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 20;
  const [user, setUser] = useState<Customer | null>(null);
  const pointBarRef = useRef<HTMLDivElement | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [rateDen, setRateDen] = useState<number>(10000);
  const isCategoryPath = location.pathname.startsWith("/flea-market/category/");
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const slug = isCategoryPath ? pathSegments[pathSegments.length - 1] : null;
  const currentType = searchParams.get("type") || "";
  const CATEGORY_TYPES = [
    { value: "", label: "すべて" },
    { value: "INSECT", label: "昆虫" },
    { value: "REPTILE", label: "爬虫類" },
    { value: "AMPHIBIAN", label: "両生類" },
    { value: "MAMMAL", label: "小動物" },
    { value: "FISH", label: "魚類" },
    { value: "SUPPLY", label: "飼育用品" },
  ];

  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);

  const handleFilterChange = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const fetchData = useCallback(
    async (currentOffset: number, isLoadMore: boolean) => {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);
      try {
        let targetCategoryId = Number(searchParams.get("category_id")) || 0;
        let targetSupplyTypeId = 0;
        let targetType = searchParams.get("type") || "";
        if (slug) {
          try {
            const catRes = await api.get(`/api/category/lookup?slug=${slug}`);
            if (catRes.data?.id) {
              if (catRes.data.type === "SUPPLY") {
                targetType = "SUPPLY";
                targetSupplyTypeId = catRes.data.id;
                targetCategoryId = 0;
              } else {
                targetCategoryId = catRes.data.id;
                targetSupplyTypeId = 0;
              }
            }
          } catch {
            /* ignore */
          }
        }
        const payload = {
          page: Math.floor(currentOffset / limit) + 1,
          limit,
          category_id: targetCategoryId,
          supply_type_id: targetSupplyTypeId,
          type: targetType,
          keyword: searchParams.get("keyword") || "",
        };
        const res = await api.post("/flea-market/list", payload);
        const items: FleaListContent[] = res.data.items || [];
        if (isLoadMore) setContents((prev) => [...prev, ...items]);
        else setContents(items);
        hasMoreRef.current = items.length === limit;
        offsetRef.current = currentOffset + items.length;
        if (res.data.rate_den) setRateDen(res.data.rate_den);
      } catch (e) {
        console.error(e);
      } finally {
        if (isLoadMore) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [searchParams, slug],
  );

  useEffect(() => {
    setContents([]);
    offsetRef.current = 0;
    hasMoreRef.current = true;
    fetchData(0, false);
  }, [searchParams, location.pathname]);

  useEffect(() => {
    const token = getAccessToken();
    if (token && token !== "undefined") {
      api
        .post("customer")
        .then((res) => setUser(res.data.user || null))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const el = pointBarRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsPinned(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={s.page}>
      <Header />

      {/* 固定ポイントバー */}
      <div style={s.pointBar(isPinned)}>
        <div style={s.pointBadge}>
          <span style={{ fontWeight: 600, fontSize: 12 }}>P残高</span>
          <span
            style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 16 }}
          >
            {user?.point.toLocaleString()}
          </span>
        </div>
      </div>

      <main style={s.main}>
        <div style={s.layout}>
          {/* サイドバー（PC） */}
          <aside style={{ ...s.sidebar, display: "none" }}>
            <div style={s.filterCard}>
              <h2 style={s.filterTitle}>絞り込み</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {CATEGORY_TYPES.map((cat) => (
                  <div
                    key={cat.value}
                    onClick={() => handleFilterChange("type", cat.value)}
                    style={s.filterItem(currentType === cat.value)}
                  >
                    {cat.label}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div style={{ minWidth: 0 }}>
            {/* ポイントカード */}
            {user && (
              <div ref={pointBarRef} style={{ marginBottom: 24 }}>
                <div style={s.pointCard}>
                  <div style={s.pointCardInner}>
                    <div style={s.pointIconWrap}>
                      <span style={{ fontSize: 20 }}>💎</span>
                    </div>
                    <div>
                      <p style={s.pointLabel}>現在の所持ポイント</p>
                      <p style={{ ...s.pointValue, lineHeight: 1 }}>
                        {user.point.toLocaleString()}{" "}
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 400,
                            color: "#8c8c8c",
                          }}
                        >
                          pt
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 商品グリッド */}
            <div style={s.grid}>
              {contents.map((item) => {
                const rawRate = safeRate(item.seller_rate);
                const { num, den } = normalizeRate(rawRate, rateDen);
                const isRateUp = num > den;
                const { discountYen } = user
                  ? calcRateDiscount(item.price, user.point, rawRate, rateDen)
                  : { discountYen: 0 };
                return (
                  <a
                    key={item.id}
                    href={`/flea-market/item/${item.id}`}
                    style={s.card}
                  >
                    <div style={s.cardImgWrap}>
                      {item.main_image_url ? (
                        <img
                          src={CONFIG.BASE_URL + item.main_image_url}
                          alt={item.name}
                          style={s.cardImg}
                        />
                      ) : null}
                      {item.seller_icon_url && (
                        <img
                          src={CONFIG.BASE_URL + item.seller_icon_url}
                          alt={item.seller_name}
                          style={s.sellerAvatar}
                        />
                      )}
                      <div style={s.likeBtn}>
                        <LikeButton
                          itemId={item.id}
                          initialLiked={item.is_liked}
                          size={20}
                        />
                      </div>
                    </div>
                    <div style={s.cardBody}>
                      <div style={s.cardName}>{item.name}</div>
                      <div style={s.cardPrice}>
                        ¥{item.price.toLocaleString()}
                      </div>
                      {isRateUp && discountYen > 0 && (
                        <span style={s.pointDiscount}>
                          ポイントで -{discountYen.toLocaleString()}円
                        </span>
                      )}
                      {isRateUp && discountYen === 0 && (
                        <span style={s.pointDiscountGray}>
                          ポイントでおトク
                        </span>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>

            {/* スケルトン */}
            {(loading || loadingMore) && (
              <div style={s.grid}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={s.skeleton}>
                    <div style={s.skeletonImg}>
                      <div style={{ ...s.skeletonAvatarPlaceholder }} />
                      <div style={{ ...s.skeletonLikePlaceholder }} />
                    </div>
                    <div style={s.skeletonBody}>
                      <div style={s.skeletonLine("100%")} />
                      <div style={s.skeletonLine("66%")} />
                      <div
                        style={{ ...s.skeletonLine("50%"), marginTop: "auto" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !loadingMore && contents.length === 0 && (
              <div style={s.empty}>
                <p>出品されている商品はありません</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FleaMarketList;
