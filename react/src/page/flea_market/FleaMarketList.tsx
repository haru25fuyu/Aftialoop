import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Header from "../../component/Header.tsx";
import api, { getAccessToken } from "../../conf/api.ts";
import { CONFIG } from "../../conf/config.ts";
import { LikeButton } from "../../component/LikeButton.tsx";

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

type Customer = {
    point: number;
};

const DEFAULT_RATE = 1.00;

function safeRate(v: number | null | undefined): number {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_RATE;
    return n;
}

// レートの分子・分母を正しく整えて返すヘルパー
function normalizeRate(rawRate: number, den: number) {
    if (rawRate > 2.0) {
        return { num: Math.round(rawRate), den: den };
    }
    return { num: Math.round(rawRate * den), den: den };
}

function calcRateDiscount(priceYen: number, userPoint: number, rawRate: number, rateDen: number) {
    const price = Math.floor(priceYen);
    const point = Math.floor(userPoint);
    const { num: scaledRate, den } = normalizeRate(rawRate, rateDen);

    if (scaledRate <= den) return { discountYen: 0 };

    const needPt = Math.floor((price * den) / scaledRate);
    const usePt = Math.min(point, needPt);

    let coveredYen;
    if (usePt >= needPt) {
        coveredYen = price;
    } else {
        coveredYen = Math.floor((usePt * scaledRate) / den);
        coveredYen = Math.min(coveredYen, price);
    }
    const discountYen = Math.max(0, coveredYen - usePt);
    return { discountYen };
}

const FleaMarketList: React.FC = () => {
    // --- 無限スクロール用 State ---
    const [contents, setContents] = useState<FleaListContent[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);      // 初回ロード
    const [loadingMore, setLoadingMore] = useState(false); // 追加ロード
    const limit = 20;

    const [user, setUser] = useState<Customer | null>(null);
    const pointBarRef = useRef<HTMLDivElement | null>(null);
    const [isPinned, setIsPinned] = useState(false);
    const [rateDen, setRateDen] = useState<number>(10000);

    // --- IntersectionObserver (スクロール検知) ---
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLAnchorElement | null) => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setOffset(prev => prev + limit);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    // 1. ユーザー情報取得 (初回のみ)
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = getAccessToken();
                if (token && token !== "undefined") {
                    const res = await api.post("/customer", {});
                    if (res.data?.user) {
                        setUser(res.data.user);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchUser();
    }, []);

    // 2. 商品リスト取得 (offset変更時に発火)
    useEffect(() => {
        const fetchData = async () => {
            if (offset === 0) setLoading(true);
            else setLoadingMore(true);

            try {
                // クエリパラメータで limit, offset を渡す
                const res = await api.post(`/flea-market/list?limit=${limit}&offset=${offset}`);

                let newItems: FleaListContent[] = [];
                if (res.data && res.data.items) {
                    newItems = res.data.items;
                    if (res.data.rate_den) {
                        setRateDen(Number(res.data.rate_den));
                    }
                } else if (Array.isArray(res.data)) {
                    newItems = res.data;
                }

                setContents(prev => {
                    // 重複排除して追加
                    const existingIds = new Set(prev.map(item => item.id));
                    const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
                    return [...prev, ...uniqueNewItems];
                });

                // 取得数がlimit未満なら終了
                if (newItems.length < limit) {
                    setHasMore(false);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        };
        fetchData();
    }, [offset]);

    // 3. スクロール追従バーの制御
    useEffect(() => {
        const el = pointBarRef.current;
        if (!el) return;
        const headerHeight = 60;
        const handleScroll = () => {
            if (!el) return;
            const rect = el.getBoundingClientRect();
            setIsPinned(rect.bottom <= headerHeight);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, [loading]);

    // レート計算
    const bestRateContent = useMemo(() => {
        return contents.reduce((max, item) => {
            const r = safeRate(item.seller_rate);
            return r > max ? r : max;
        }, DEFAULT_RATE);
    }, [contents]);

    const maxDiscountAnywhere = useMemo(() => {
        if (!user) return 0;
        const pt = Math.floor(user.point);
        const { num, den } = normalizeRate(bestRateContent, rateDen);
        const worthYen = Math.floor((pt * num) / den);
        return Math.max(0, worthYen - pt);
    }, [user, bestRateContent, rateDen]);

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />

            {/* ① 所持ポイント追従バッジ */}
            <div
                className={`fixed top-[70px] right-4 z-40 transition-all duration-300 transform ${user && isPinned ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"
                    }`}
            >
                <div className="bg-emerald-600/95 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm border border-emerald-500">
                    <span className="font-semibold text-emerald-100 text-xs">P残高</span>
                    <span className="font-bold font-mono text-base">{user?.point.toLocaleString()}</span>
                </div>
            </div>

            <main className="w-full max-w-[1400px] mx-auto pt-6 px-4">
                <div className="grid grid-cols-1 lg:grid-cols-[260px,minmax(0,1fr)] gap-8 items-start">

                    {/* サイドバー */}
                    <aside className="hidden lg:block sticky top-24 space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                絞り込み
                            </h2>
                            <div className="space-y-3">
                                <div className="text-sm text-gray-600 hover:bg-gray-50 p-2 rounded cursor-pointer">すべて</div>
                                <div className="text-sm text-gray-600 hover:bg-gray-50 p-2 rounded cursor-pointer">生体</div>
                                <div className="text-sm text-gray-600 hover:bg-gray-50 p-2 rounded cursor-pointer">用品</div>
                            </div>
                        </div>
                    </aside>

                    <div className="min-w-0">
                        {/* ③ 上部ポイントバー */}
                        {user && (
                            <div ref={pointBarRef} className="mb-6">
                                <div className="bg-white border border-emerald-100 rounded-2xl p-4 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                            <span className="text-xl">💎</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">現在の所持ポイント</p>
                                            <p className="text-emerald-700 font-bold text-xl font-mono leading-none mt-0.5">
                                                {user.point.toLocaleString()} <span className="text-sm font-normal text-gray-500">pt</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="hidden md:block w-px h-10 bg-gray-100"></div>

                                    <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-xl">
                                        <div className="text-emerald-600 text-sm font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-emerald-100">UP</div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-emerald-800 font-medium">レート割引（最大）</p>
                                            <p className="text-emerald-700 font-bold text-base leading-none">
                                                -¥{maxDiscountAnywhere.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 商品グリッド */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                            {contents.map((item, index) => {
                                const price = Math.floor(item.price);
                                const rawRate = safeRate(item.seller_rate);
                                const isSoldOut = item.quantity <= 0;

                                const { num, den } = normalizeRate(rawRate, rateDen);
                                const isRateUp = num > den;

                                const { discountYen } = user
                                    ? calcRateDiscount(price, user.point, rawRate, rateDen)
                                    : { discountYen: 0 };

                                // ★修正: refは aタグ に直接付け、余計なdivは削除しました
                                return (
                                    <a
                                        key={`${item.id}-${index}`}
                                        ref={index === contents.length - 1 ? lastElementRef : null}
                                        href={`/flea-market/item/${item.id}`}
                                        className="group relative flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                    >
                                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                                            <img
                                                src={item.main_image_url ? CONFIG.BASE_URL + item.main_image_url : "/data/noimage.png"}
                                                alt={item.name}
                                                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isSoldOut ? "opacity-60 grayscale" : ""}`}
                                            />
                                            <div className="absolute top-2 left-2 z-10">
                                                <img
                                                    src={item.seller_icon_url ? CONFIG.BASE_URL + item.seller_icon_url : "/icons/default.png"}
                                                    alt="seller"
                                                    className="w-8 h-8 rounded-full border-2 border-white shadow-md object-cover"
                                                />
                                            </div>
                                            {isSoldOut && (
                                                <div className="absolute top-0 left-0 z-20">
                                                    <div className="w-0 h-0 border-t-[80px] border-t-red-600 border-r-[80px] border-r-transparent"></div>
                                                    <span className="absolute top-4 left-1 -rotate-45 text-white font-bold text-sm tracking-widest">SOLD</span>
                                                </div>
                                            )}
                                            {/* 右下に配置 */}
                                            <div className="absolute bottom-2 right-2">
                                                <LikeButton
                                                    itemId={item.id}
                                                    initialLiked={item.is_liked}
                                                    className="bg-white p-1.5 rounded-full shadow-sm bg-opacity-90"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-3 flex flex-col flex-1">
                                            <h3 className="font-medium text-sm text-gray-800 leading-snug line-clamp-2 mb-1 min-h-[2.5em]">
                                                {item.name}
                                            </h3>

                                            <div className="mt-auto">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-lg font-bold text-gray-900">¥{price.toLocaleString()}</span>
                                                    {item.shipping_fee_type === 0 && (
                                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">込</span>
                                                    )}
                                                </div>

                                                {isRateUp && !isSoldOut && (
                                                    <div className="mt-2 text-[11px]">
                                                        {discountYen > 0 ? (
                                                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 inline-block">
                                                                ポイントで -{discountYen.toLocaleString()}円
                                                            </span>
                                                        ) : (
                                                            <span className="text-emerald-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                                                ポイントでおトク
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>

                        {/* ローディング表示 */}
                        {(loading || loadingMore) && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mt-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl p-2 shadow-sm animate-pulse">
                                        <div className="w-full aspect-square bg-gray-200 rounded-xl mb-2"></div>
                                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && !loadingMore && contents.length === 0 && (
                            <div className="py-20 text-center text-gray-500">
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