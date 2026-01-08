import React, { useEffect, useMemo, useRef, useState } from "react";

import { FleaListContent, Customer } from "../../types/Content.ts";

import Header from "../../component/Header.tsx";
import api, { getAccessToken } from "../../conf/api.ts";
import { CONFIG } from "../../conf/config.ts";

const DEFAULT_RATE = 1.02;

function safeRate(v: any) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_RATE;
    return n;
}

function yenFloor(n: number) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
}

function yenCeil(n: number) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.ceil(n));
}

/**
 * 一覧表示用：
 * - 「割引」はレートアップ分（= floor(pt*rate) - pt）を、商品価格上限で計算
 * - ポイント自体の“円OFF”は出さない（先払い思想を崩さない）
 */
function calcRateDiscountAndMaxPoints(priceYen: number, userPoint: number, rate: number) {
    const price = yenFloor(priceYen);
    const point = yenFloor(userPoint);
    const r = Math.max(0.000001, rate);

    // この商品をポイントのみで買うのに必要なpt（レート適用）
    const needPtFull = yenCeil(price / r);

    // この商品で最大使えるpt（残高と必要ptの小さい方）
    const maxUsePt = Math.min(point, needPtFull);

    // 実際にポイントで相殺される円（商品価格を超えない）
    const coveredYen = Math.min(price, yenFloor(maxUsePt * r));

    // レートアップ分の「割引」（1pt=1円との差）
    const rateDiscountYen = Math.max(0, coveredYen - maxUsePt);

    return { maxUsePt, rateDiscountYen };
}

const FleaMarketList: React.FC = () => {
    const [contents, setContents] = useState<FleaListContent[]>([]);
    const [user, setUser] = useState<Customer | null>(null);

    const pointBarRef = useRef<HTMLDivElement | null>(null);
    const [isPinned, setIsPinned] = useState(false);

    useEffect(() => {
        api
            .post(`/flea-market/list`)
            .then((res) => setContents(res.data))
            .catch((err) => console.error(err));

        const token = getAccessToken();
        if (token && token !== "undefined") {
            api
                .post("/customer", {})
                .then((res) => setUser(res.data.user))
                .catch((err) => console.error(err));
        }
    }, []);

    // 追従バッジ（スクロール監視）
    // 追従バッジ（スクロール監視）
    useEffect(() => {
        const el = pointBarRef.current;
        if (!el) return;

        const headerHeight = 56;

        const handleScroll = () => {
            const rect = el.getBoundingClientRect();
            setIsPinned(rect.top <= headerHeight);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();

        return () => window.removeEventListener("scroll", handleScroll);
    }, [user, contents.length]); // ← ここ重要（refが付くタイミングで再実行）


    // 一覧内の最大レート（ポイントバー用）
    const bestRate = useMemo(() => {
        return contents.reduce((acc, item) => Math.max(acc, safeRate((item as any).seller_rate)), DEFAULT_RATE);
    }, [contents]);

    // バーで出す「レート割引（最大）」：残高を全部使えたと仮定したときのレート差分だけ
    const maxRateDiscountAnywhere = useMemo(() => {
        if (!user) return 0;
        const pt = yenFloor(user.point);
        const r = Math.max(0.000001, bestRate);
        // 決済と同じ考え方：floor(pt*rate) - pt
        return Math.max(0, yenFloor(pt * r) - pt);
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
                        {/* 上部ポイントバー（決済ページと同じ“割引”表記に寄せる） */}
                        {user && (
                            <div ref={pointBarRef} className="max-w-screen-lg mx-auto px-2 mb-2">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-3 py-2 flex items-baseline justify-between shadow-sm">
                                    <div>
                                        <p className="text-[11px] text-emerald-700 font-semibold">あなたのサブスクポイント</p>
                                        <p className="text-emerald-900 font-bold text-sm">{user.point.toLocaleString()} pt</p>
                                    </div>

                                    <div className="text-right text-[11px] text-emerald-700">
                                        <p>レート割引（最大）</p>
                                        <p className="font-semibold">-¥{maxRateDiscountAnywhere.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 商品グリッド */}
                        <section className="pt-1 pb-6">
                            <div className="max-w-screen-lg mx-auto px-2">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 md:gap-3">
                                    {contents.map((item) => {
                                        const price = yenFloor(item.price);
                                        const rate = safeRate((item as any).seller_rate);

                                        const { maxUsePt, rateDiscountYen } = user
                                            ? calcRateDiscountAndMaxPoints(price, user.point, rate)
                                            : { maxUsePt: 0, rateDiscountYen: 0 };

                                        return (
                                            <a
                                                key={item.id}
                                                href={`/flea-market/item/${item.id}`}
                                                className="group block bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                            >
                                                {/* 画像 */}
                                                <div className="relative overflow-hidden">
                                                    <img
                                                        src={item.main_image_url ? CONFIG.BASE_URL + item.main_image_url : "/data/noimage.png"}
                                                        alt={item.name}
                                                        className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />

                                                    {/* 出品者アイコン */}
                                                    <div className="absolute top-1.5 left-1.5 bg-black/40 backdrop-blur-sm rounded-full p-[2px] shadow-sm">
                                                        <img
                                                            src={item.seller_icon_url ? CONFIG.BASE_URL + item.seller_icon_url : "/data/noicon.png"}
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
                                                        ¥{price.toLocaleString()}
                                                    </p>

                                                    {/* 決済ページと同じスタイル：割引 / 使うポイント だけ */}
                                                    {user ? (
                                                        <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                                                            ポイント利用で最大 {rateDiscountYen.toLocaleString()}円割引
                                                        </p>
                                                    ) : (
                                                        <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                                                            ポイント利用で最大 {rateDiscountYen.toLocaleString()}円割引
                                                        </p>
                                                    )}
                                                    <p className="text-gray-500 font-medium mt-1 text-[11px]">送料込み</p>
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
