import React, { useEffect, useMemo, useRef, useState } from "react";
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
// APIが "1.02" を返す場合と "10200" (den=10000) を返す場合の両方に対応
function normalizeRate(rawRate: number, den: number) {
    // レートが2.0より大きい（例: 10200）なら、それは分子そのものとみなす
    if (rawRate > 2.0) {
        return { num: Math.round(rawRate), den: den };
    }
    // レートが小数の場合（例: 1.02）は、分母に合わせて分子を作る
    return { num: Math.round(rawRate * den), den: den };
}

function calcRateDiscount(priceYen: number, userPoint: number, rawRate: number, rateDen: number) {
    const price = Math.floor(priceYen);
    const point = Math.floor(userPoint);
    const { num: scaledRate, den } = normalizeRate(rawRate, rateDen);

    if (scaledRate <= den) return { discountYen: 0 };

    // 1. 必要ポイントの計算（★変更点：Ceil→Floor）
    //    端数を切り捨てることで、「1960.7pt必要」なら「1960pt」でOKにする（お客様有利）
    //    式: floor(価格 * 分母 / 分子)
    const needPt = Math.floor((price * den) / scaledRate);

    // 2. 実際に消費できるポイント
    const usePt = Math.min(point, needPt);

    // 3. 充当される金額（円）
    let coveredYen;

    if (usePt >= needPt) {
        // ★ポイントが必要数足りているなら、計算上の端数がどうあれ「全額カバー」とみなす
        // 例: 1960pt * 1.02 = 1999.2円 だとしても、2000円の商品は買えることにする
        coveredYen = price;
    } else {
        // 部分払いの場合：支払ったポイント分の価値だけ計算
        coveredYen = Math.floor((usePt * scaledRate) / den);
        // 万が一、レート計算で価格を超えてしまった場合のキャップ
        coveredYen = Math.min(coveredYen, price);
    }

    // 4. 「充当された金額」 - 「減ったポイント」 = 「浮いた金額」
    //    例: 2000円 - 1960pt = 40円お得！
    const discountYen = Math.max(0, coveredYen - usePt);

    return { discountYen };
}

const FleaMarketList: React.FC = () => {
    const [contents, setContents] = useState<FleaListContent[]>([]);
    const [user, setUser] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const pointBarRef = useRef<HTMLDivElement | null>(null);
    const [isPinned, setIsPinned] = useState(false);

    // APIから受け取るレート分母
    const [rateDen, setRateDen] = useState<number>(10000);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [listRes, userRes] = await Promise.all([
                    api.post(`/flea-market/list`),
                    (async () => {
                        const token = getAccessToken();
                        if (token && token !== "undefined") {
                            return api.post("/customer", {});
                        }
                        return { data: { user: null } };
                    })()
                ]);

                if (listRes.data && listRes.data.items) {
                    setContents(listRes.data.items);
                    if (listRes.data.rate_den) {
                        setRateDen(Number(listRes.data.rate_den));
                    }
                } else if (Array.isArray(listRes.data)) {
                    setContents(listRes.data);
                }

                if (userRes.data?.user) {
                    setUser(userRes.data.user);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
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

    // 一覧内の最大レート計算（ここも修正）
    const bestRateContent = useMemo(() => {
        return contents.reduce((max, item) => {
            const r = safeRate(item.seller_rate);
            return r > max ? r : max;
        }, DEFAULT_RATE);
    }, [contents]);

    // 最大割引（Topバー表示用）
    const maxDiscountAnywhere = useMemo(() => {
        if (!user) return 0;
        const pt = Math.floor(user.point);

        // normalizeRateを使って計算
        const { num, den } = normalizeRate(bestRateContent, rateDen);

        // pt * 分子 / 分母
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
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl p-2 shadow-sm animate-pulse">
                                        <div className="w-full aspect-square bg-gray-200 rounded-xl mb-2"></div>
                                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                                {contents.map((item) => {
                                    const price = Math.floor(item.price);
                                    const rawRate = safeRate(item.seller_rate);
                                    const isSoldOut = item.quantity <= 0;

                                    // 表示判定用に正規化レートを確認
                                    const { num, den } = normalizeRate(rawRate, rateDen);
                                    const isRateUp = num > den;

                                    const { discountYen } = user
                                        ? calcRateDiscount(price, user.point, rawRate, rateDen)
                                        : { discountYen: 0 };

                                    return (
                                        <a
                                            key={item.id}
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

                                                    {/* レート割引表記（バッジなし・差額のみ） */}
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
                        )}
                        {!loading && contents.length === 0 && (
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