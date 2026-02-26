import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import Header from "../../component/Header.tsx";
import api, { getAccessToken } from "../../conf/api.ts";
import { CONFIG } from "../../conf/config.ts";
import { LikeButton } from "../../component/LikeButton.tsx";
import SearchBar from "../../component/SearchBar.tsx";

// --- 型定義 ---
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
    // URLクエリパラメータのフック
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    // --- State ---
    const [contents, setContents] = useState<FleaListContent[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const limit = 20;

    const [user, setUser] = useState<Customer | null>(null);
    const pointBarRef = useRef<HTMLDivElement | null>(null);
    const [isPinned, setIsPinned] = useState(false);
    const [rateDen, setRateDen] = useState<number>(10000);

    // URL解析: "/category/insect/stag-beetle" のようなパスかどうか判定
    const isCategoryPath = location.pathname.startsWith("/flea-market/category/");
    const pathSegments = location.pathname.split('/').filter(Boolean);
    // カテゴリーパスの場合、最後の要素をslugとする。そうでない場合はnull
    const slug = isCategoryPath ? pathSegments[pathSegments.length - 1] : null;

    // --- データ取得関数 ---
    const fetchData = async (currentOffset: number, isLoadMore: boolean) => {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        try {
            // -------------------------------------------------
            // 1. 変数の初期化 (まずはURLクエリパラメータやデフォルト値をセット)
            // -------------------------------------------------
            let targetCategoryId = Number(searchParams.get("category_id")) || 0;
            let targetSupplyTypeId = 0; // 用品ID用
            let targetType = searchParams.get("type") || ""; // "SUPPLY" など

            // -------------------------------------------------
            // 2. Slugがある場合、APIで正解を聞いてくる
            // -------------------------------------------------
            if (slug) {
                try {
                    const catRes = await api.get(`/api/category/lookup?slug=${slug}`);
                    if (catRes.data && catRes.data.id) {
                        const lookupData = catRes.data;

                        // APIの結果を見て、変数を更新する
                        if (lookupData.type === 'SUPPLY') {
                            // ★用品の場合
                            targetType = 'SUPPLY';
                            targetSupplyTypeId = lookupData.id; // 用品IDとしてセット
                            targetCategoryId = 0; // 生体IDはクリア
                        } else {
                            // ★生体の場合
                            targetCategoryId = lookupData.id; // カテゴリーIDとしてセット
                            targetSupplyTypeId = 0;
                            // targetType は生体の場合は空のままでOK（または 'INSECT' 等があればセット）
                        }
                    }
                } catch (e) {
                    console.error("Category lookup failed:", e);
                }
            }

            // -------------------------------------------------
            // 3. 確定した変数を使って Payload を構築 (ここで作る！)
            // -------------------------------------------------
            const payload = {
                page: Math.floor(currentOffset / limit) + 1,
                limit: limit,

                // ★解決済みの変数を使う
                category_id: targetCategoryId,
                supply_type_id: targetSupplyTypeId, // ★バックエンドに追加した新フィールド
                type: targetType,

                // その他の条件
                keyword: searchParams.get("keyword") || "",
                min_price: searchParams.get("min_price") ? Number(searchParams.get("min_price")) : undefined,
                max_price: searchParams.get("max_price") ? Number(searchParams.get("max_price")) : undefined,
                status: searchParams.get("status") ? Number(searchParams.get("status")) : 0,
                sort: searchParams.get("sort") || "",

                detail_sex: searchParams.get("detail_sex") || "",
                detail_locality: searchParams.get("detail_locality") || "",
                detail_brand: searchParams.get("detail_brand") || "",
            };

            // 4. 商品リスト取得
            const res = await api.post(`/flea-market/list?limit=${limit}&offset=${currentOffset}`, payload);

            // ... (以下、データセット処理はそのまま) ...
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
                if (!isLoadMore) return newItems;
                const existingIds = new Set(prev.map(item => item.id));
                const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
                return [...prev, ...uniqueNewItems];
            });

            if (newItems.length < limit) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // --- Effect: 検索条件(URL/Slug)が変わった時 ---
    useEffect(() => {
        setOffset(0);
        setHasMore(true);
        fetchData(0, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, slug]); // slugが変わった時も再取得

    // --- Effect: 無限スクロール ---
    useEffect(() => {
        if (offset > 0) {
            fetchData(offset, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [offset]);

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

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = getAccessToken();
                if (token && token !== "undefined") {
                    const res = await api.post("/customer", {});
                    if (res.data?.user) setUser(res.data.user);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchUser();
    }, []);

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

    const handleFilterChange = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams);
    };

    const currentType = searchParams.get("type");

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />
            <SearchBar />
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
                    <aside className="hidden lg:block sticky top-24 space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                絞り込み
                            </h2>
                            <div className="space-y-3">
                                <div
                                    onClick={() => handleFilterChange("type", "")}
                                    className={`text-sm p-2 rounded cursor-pointer ${!currentType ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-600 hover:bg-gray-50"}`}
                                >
                                    すべて
                                </div>
                                <div
                                    onClick={() => handleFilterChange("type", "INSECT")}
                                    className={`text-sm p-2 rounded cursor-pointer ${currentType === "INSECT" ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-600 hover:bg-gray-50"}`}
                                >
                                    昆虫
                                </div>
                                <div
                                    onClick={() => handleFilterChange("type", "REPTILE")}
                                    className={`text-sm p-2 rounded cursor-pointer ${currentType === "REPTILE" ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-600 hover:bg-gray-50"}`}
                                >
                                    爬虫類
                                </div>
                                <div
                                    onClick={() => handleFilterChange("type", "SUPPLY")}
                                    className={`text-sm p-2 rounded cursor-pointer ${currentType === "SUPPLY" ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-600 hover:bg-gray-50"}`}
                                >
                                    用品
                                </div>
                            </div>
                        </div>
                    </aside>

                    <div className="min-w-0">
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

                        {(loading || loadingMore) && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mt-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                                        {/* 商品画像エリア */}
                                        <div className="relative aspect-square bg-gray-200">
                                            {/* 出品者アイコンのプレースホルダー */}
                                            <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-gray-300 border-2 border-white"></div>
                                            {/* いいねボタンのプレースホルダー */}
                                            <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-gray-300"></div>
                                        </div>

                                        {/* テキストエリア */}
                                        <div className="p-3 flex flex-col flex-1 gap-2">
                                            {/* タイトル (2行分) */}
                                            <div className="h-3.5 bg-gray-200 rounded w-full mt-1"></div>
                                            <div className="h-3.5 bg-gray-200 rounded w-2/3"></div>

                                            {/* 価格 */}
                                            <div className="h-5 bg-gray-300 rounded w-1/2 mt-auto"></div>
                                        </div>
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