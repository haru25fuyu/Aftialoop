import React, { useEffect, useRef } from "react";

import { FleaListContent, Customer } from "../../types/Content.ts";

import Header from "../../component/Header.tsx";
import api, { getAccessToken } from "../../conf/api.ts";
import { CONFIG } from "../../conf/config.ts";

const DEFAULT_RATE = 1.02;

function clampInt(n: number) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
}

function calcMaxDiscount(price: number, userPoint: number, rate: number) {
    // 1pt = rate 円引ける、ただし商品価格を超えない
    const raw = clampInt(userPoint * rate);
    return Math.min(raw, Math.max(0, Math.floor(price)));
}

const FleaMarketList: React.FC = () => {
    const [contents, setContents] = React.useState<FleaListContent[]>([]);
    const [user, setUser] = React.useState<Customer | null>(null);

    const pointBarRef = useRef<HTMLDivElement | null>(null);
    const [isPinned, setIsPinned] = React.useState(false);

    useEffect(() => {
        api
            .post(`/flea-market/list`)
            .then((res) => {
                setContents(res.data);
            })
            .catch((err) => {
                console.error(err);
            });

        const token = getAccessToken();
        if (token && token !== "undefined") {
            api
                .post("/customer", {})
                .then((res) => {
                    setUser(res.data.user);
                })
                .catch((err) => {
                    console.error(err);
                });
        }
    }, []);

    // 追従バッジ（スクロール監視）
    useEffect(() => {
        const el = pointBarRef.current;
        if (!el) return;

        const headerHeight = 56;

        const handleScroll = () => {
            const rect = el.getBoundingClientRect();
            setIsPinned(rect.top <= headerHeight);
        };

        window.addEventListener("scroll", handleScroll);
        handleScroll();

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // 一覧内の最大倍率（ポイントバー用）
    const bestRate = React.useMemo(() => {
        const m = contents.reduce((acc, item) => {
            const r = Number(item.seller_rate);
            if (!Number.isFinite(r) || r <= 0) return acc;
            return Math.max(acc, r);
        }, DEFAULT_RATE);
        return m;
    }, [contents]);

    // ポイントバー：一覧内最大倍率で「最大割引」
    const maxDiscountAnywhere = React.useMemo(() => {
        if (!user) return 0;
        return clampInt(user.point * bestRate);
    }, [user, bestRate]);

    return (
        <div>
            <header>
                <Header />
            </header>

            {/* 所持ポイント追従バッジ */}
            {user && isPinned && (
                <div className="fixed top-[56px] right-3 z-40 transition-opacity duration-200 opacity-100">
                    <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 text-xs md:text-sm">
                        <span className="font-semibold">所持P</span>
                        <span className="font-bold">{user.point.toLocaleString()}</span>
                        <span className="text-[10px] md:text-[11px]">pt</span>
                    </div>
                </div>
            )}

            <main className="w-full">
                <div className="w-[94%] mx-auto grid grid-cols-1 lg:grid-cols-[240px,minmax(0,1fr)] gap-6">
                    {/* サイドバー */}
                    <aside className="hidden lg:block">
                        <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3 text-sm">
                            <h2 className="font-semibold mb-2">絞り込み一覧</h2>
                            {/* フィルタとか */}
                        </div>
                    </aside>

                    {/* メイン */}
                    <div className="bg-slate-50 py-2">
                        {/* 上部ポイントバー */}
                        {user && (
                            <div ref={pointBarRef} className="max-w-screen-lg mx-auto px-2 mb-2">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-3 py-2 flex items-baseline justify-between shadow-sm">
                                    <div>
                                        <p className="text-[11px] text-emerald-700 font-semibold">
                                            あなたのサブスクポイント
                                        </p>
                                        <p className="text-emerald-900 font-bold text-sm">
                                            {user.point.toLocaleString()} pt
                                        </p>
                                    </div>

                                    <div className="text-right text-[11px] text-emerald-700">
                                        <p>ポイント全額利用で</p>
                                        <p className="font-semibold">
                                            最大 {maxDiscountAnywhere.toLocaleString()}円OFF
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 商品グリッド */}
                        <section className="pt-1 pb-6">
                            <div className="max-w-screen-lg mx-auto px-2">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 md:gap-3">
                                    {contents.map((item) => {
                                        const rateRaw = Number(item.seller_rate);
                                        const rate =
                                            Number.isFinite(rateRaw) && rateRaw > 0 ? rateRaw : DEFAULT_RATE;

                                        const maxOff = user
                                            ? calcMaxDiscount(item.price, user.point, rate)
                                            : 0;

                                        const afterPrice =
                                            user ? Math.max(0, Math.floor(item.price) - maxOff) : Math.floor(item.price);

                                        return (
                                            <a
                                                key={item.id}
                                                href={`/flea-market/item/${item.id}`}
                                                className="group block bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                            >
                                                {/* 画像 */}
                                                <div className="relative overflow-hidden">
                                                    <img
                                                        src={
                                                            item.main_image_url
                                                                ? CONFIG.BASE_URL + item.main_image_url
                                                                : "/data/noimage.png"
                                                        }
                                                        alt={item.name}
                                                        className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />

                                                    {/* 出品者アイコン */}
                                                    <div className="absolute top-1.5 left-1.5 bg-black/40 backdrop-blur-sm rounded-full p-[2px] shadow-sm">
                                                        <img
                                                            src={
                                                                item.seller_icon_url
                                                                    ? CONFIG.BASE_URL + item.seller_icon_url
                                                                    : "/data/noicon.png"
                                                            }
                                                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                                                            alt="seller"
                                                        />
                                                    </div>
                                                </div>

                                                {/* 商品名 & 価格 */}
                                                <div className="min-w-0 px-2.5 py-3">
                                                    <h3 className="font-semibold text-[13px] text-black leading-tight line-clamp-2">
                                                        {item.name}
                                                    </h3>

                                                    {/* 価格（カード基準） */}
                                                    <p className="mt-1 text-[13px] font-bold text-black">
                                                        ¥{Math.floor(item.price).toLocaleString()}
                                                    </p>

                                                    {/* “カードよりどれだけ得か” */}
                                                    {user ? (
                                                        <>
                                                            <p className="text-[11px] text-emerald-700 font-semibold">
                                                                ポイントで最大 {maxOff.toLocaleString()}円OFF
                                                            </p>
                                                            <p className="text-[11px] text-gray-700">
                                                                実質 ¥{afterPrice.toLocaleString()}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <p className="text-[11px] text-gray-600">
                                                            ログインでポイント割引を表示
                                                        </p>
                                                    )}

                                                    <p className="text-gray-500 font-medium mt-1 text-[11px]">
                                                        送料込み
                                                    </p>
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default FleaMarketList;
