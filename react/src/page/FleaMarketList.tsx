import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { FleaListContent, Customer } from '../types/Content.ts';

import Header from '../component/Header.tsx';
import MainImage from '../component/MainImage.tsx';

import api from '../conf/api.ts';
import { CONFIG } from '../conf/config.ts';

import '../css/List.css';

const FleaMarketList: React.FC = () => {
    const [contents, setContents] = React.useState<FleaListContent[]>([]);
    const [user, setUser] = React.useState<Customer | null>(null);

    const num = 0.02;

    const pointBarRef = useRef<HTMLDivElement | null>(null);
    const [isPinned, setIsPinned] = React.useState(false);

    useEffect(() => {
        api.post(`/flea-market/list`)
            .then((res) => {
                setContents(res.data);
            }).catch((err) => {
                console.error(err);
            });

        const token = localStorage.getItem('token');
        if (token && token !== 'undefined') {
            api.post('/customer', {})
                .then((res) => {
                    setUser(res.data.user);
                }).catch((err) => {
                    console.error(err);
                });
        }
    }, []);

    // IntersectionObserver で「バーがヘッダー下から消えたかどうか」を監視
    useEffect(() => {
        const el = pointBarRef.current;
        if (!el) return;

        const headerHeight = 56; // Headerの高さに合わせて調整

        const handleScroll = () => {
            const rect = el.getBoundingClientRect();
            // バーの上端がヘッダーの下あたりまで来たら pinned
            setIsPinned(rect.top <= headerHeight);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // 初期状態を一回計算

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div>
            {/* 固定ヘッダー想定ならここにある */}
            <header>
                <Header />
            </header>

            {/* ★ 所持ポイント「追従バッジ」（バーが上に行ったときだけ出す） */}
            {user && isPinned && (
                <div className="fixed top-[56px] right-3 z-40 transition-opacity duration-200 opacity-100">
                    <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 text-xs md:text-sm">
                        <span className="font-semibold">所持P</span>
                        <span className="font-bold">
                            {user.point.toLocaleString()}
                        </span>
                        <span className="text-[10px] md:text-[11px]">pt</span>
                    </div>
                </div>
            )}

            <main className="w-full">
                <div className="w-[94%] mx-auto grid grid-cols-1 lg:grid-cols-[240px,minmax(0,1fr)] gap-6">

                    {/* サイドバー（PCのみ） */}
                    <aside className="hidden lg:block">
                        <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3 text-sm">
                            <h2 className="font-semibold mb-2">絞り込み一覧</h2>
                            {/* フィルタとか */}
                        </div>
                    </aside>

                    {/* メインカラム */}
                    <div className="bg-slate-50 py-2">

                        {/* ★ グリッド上部のポイントバー（普通の大きい版） */}
                        {user && (
                            <div
                                ref={pointBarRef}
                                className="max-w-screen-lg mx-auto px-2 mb-2"
                            >
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
                                            最大 {Math.floor(user.point * num).toLocaleString()}円おトク
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
                                        const basePrice = item.price;

                                        let discount = 0;
                                        if (user && user.point > 0) {
                                            const usablePoint = Math.min(user.point, basePrice);
                                            discount = Math.floor(usablePoint * num);
                                        }

                                        const hasDiscount = discount > 0;
                                        const finalPrice = basePrice - discount;
                                        const bigDiscount = discount >= 100;

                                        return (
                                            <a
                                                key={item.id}
                                                href={`/item/${item.id}`}
                                                className="group block bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                            >
                                                {/* 画像 */}
                                                <div className="relative overflow-hidden">
                                                    <img
                                                        src={item.main_image_url ? CONFIG.BASE_URL + item.main_image_url : "/data/noimage.png"}
                                                        alt={item.name}
                                                        className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />

                                                    {/* オーバーレイ（左上） */}
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

                                                    <p className="text-gray-900 font-bold mt-1 text-sm">
                                                        {(hasDiscount ? finalPrice : basePrice).toLocaleString()}円
                                                    </p>

                                                    {hasDiscount ? (
                                                        <>
                                                            <p className="text-gray-400 line-through text-xs">
                                                                {basePrice.toLocaleString()}円
                                                            </p>
                                                            <p className="mt-0.5">
                                                                <span className="inline-block px-1.5 py-[1px] rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold tracking-wide">
                                                                    サブスク優待
                                                                </span>
                                                            </p>

                                                            {/* 割引額の行（緑 or グレーでメリハリ） */}
                                                            <p
                                                                className={
                                                                    bigDiscount
                                                                        ? "text-emerald-600 text-[11px] mt-0.5 font-semibold"
                                                                        : "text-gray-500 text-[11px] mt-0.5"
                                                                }
                                                            >
                                                                ポイント利用で{discount.toLocaleString()}円おトク
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <p className="text-gray-500 text-[11px] mt-0.5">
                                                            サブスクポイント利用でおトクに
                                                        </p>
                                                    )}

                                                    <p className="text-gray-500 font-medium mt-0.5 text-[11px]">
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
