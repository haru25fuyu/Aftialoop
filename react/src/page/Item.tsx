import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { Header } from '../component/Header';
import { Footer } from '../component/Footer';        // ← .tsx は不要
import DirectCheckoutModal from '../component/DirectCheckoutModal';

import { Content } from '../types/Content';
import { itemImage } from '../types/Content';  // ← itemImage をインポート

import api from '../conf/api';
import { GetItemStatusLabels } from '../conf/function'; // getItemStatusLabels をインポート

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import "swiper/swiper-bundle.css";

// ローカルストレージ用カート追加関数
const addLocalCart = (item: Content) => {
    const cart: Content[] = JSON.parse(localStorage.getItem('cart') || '[]');
    const idx = cart.findIndex(ci => ci.id === item.id);
    if (!item.quantity) return;
    if (idx !== -1) {
        cart[idx].quantity = (cart[idx].quantity || 1) + item.quantity;
    } else {
        cart.push({ ...item, quantity: item.quantity });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
};

// コンポーネント名は大文字で始めるのが慣例
const Item: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [item, setItem] = useState<Content | null>(null);
    const [images, setImages] = useState<itemImage[]>([]);
    const [selectQuantity, setSelectQuantity] = useState(1);
    const location = useLocation();
    const { id } = useParams<{ id: string }>();

    useEffect(() => {
        if (!id) {
            console.error('ID が取得できませんでした');
            return;
        }
        // ここでAPIから商品情報を取得する処理を追加する
        api.get(`/item/get/${id}`)
            .then(res => {
                if (res.data) {
                    setItem(res.data.item);
                    setImages(res.data.images || []);
                    console.log('商品情報:', res.data.item);
                    console.log('商品画像:', res.data.images);
                } else {
                    console.error('商品情報が取得できませんでした');
                }
            })
            .catch(err => {
                console.error('APIエラー:', err);
            });

        console.log('商品ID:', id);
    }, [location.search]);

    const decrement = () => {
        if (selectQuantity > 1) {
            setSelectQuantity(selectQuantity - 1);
        } else {
            alert('数量は1以上で入力してください。');
        }
    };

    const increment = () => {
        setSelectQuantity(selectQuantity + 1);
    };

    const AddCart = () => {
        if (!item) {
            alert('商品情報がありません');
            return;
        }
        const token = localStorage.getItem('token');
        const addItem: Content = { ...item, quantity: selectQuantity };
        if (!token) {
            addLocalCart(addItem);
        } else {
            api.post('/cart/add', [addItem])
                .then(res => console.log('カートに追加しました:', res.data))
                .catch(() => addLocalCart(addItem));
        }
        console.log('カートに追加');
    };

    const Purchase = () => {
        console.log('購入手続きへ');
    };

    return (
        <div>
            <Header />

            {item ? (
                <main>
                    <h2 className="text-xl font-semibold mb-2">{item.name}</h2>
                    <div className="item-detail">
                        <Swiper
                            modules={[Pagination, Navigation]}
                            direction="horizontal"
                            spaceBetween={0}
                            slidesPerView={1}
                            pagination={{ clickable: true }}
                            navigation
                            loop={true}
                            speed={500}
                        >
                            {images.map((item) => (
                                <SwiperSlide className="!w-full !h-auto" key={item.id} >
                                    <img className="!mr-0" src={item.url} alt="商品画像" />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                        <div className="item-info">
                            <div className="space-y-4 w-full">

                                {/* 価格・ポイントカード */}
                                <div className="border rounded-xl p-4 shadow-sm bg-white">
                                    <p className="text-lg font-semibold mb-2">💰 価格とポイント</p>
                                    <p>
                                        <span className="font-semibold text-gray-600 text-2xl">{item.price.toLocaleString()}</span>円(税込み)
                                    </p>
                                    <p>
                                        <span className="font-semibold text-gray-600 text-2xl">{item.point.toLocaleString()}</span> pt(ポイントで購入)
                                    </p>
                                    <p className="mt-2">
                                        <span className="font-semibold text-gray-600">在庫:</span>{" "}
                                        {item.quantity > 0 ? (
                                            <span className="text-green-600 font-medium">{item.quantity} 個</span>
                                        ) : (
                                            <span className="text-red-500 font-medium">在庫切れ{GetItemStatusLabels(item.status)}</span>
                                        )}
                                    </p>

                                    <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm w-full">
                                        {/* ラベル */}
                                        <span className="text-gray-800 text-base w-16">数量</span>

                                        {/* 数量入力 */}
                                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white flex-1 mx-2">
                                            <input
                                                type="text"
                                                value={selectQuantity}
                                                readOnly
                                                className="w-full h-10 text-center text-gray-800 bg-white outline-none"
                                            />
                                        </div>

                                        {/* ボタン群 */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={decrement}
                                                className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500  hover:bg-gray-200 transition"
                                            >
                                                －
                                            </button>
                                            <button
                                                onClick={increment}
                                                className="w-10 h-10 rounded-xl bg-gray-100 text-black hover:bg-gray-300 transition"
                                            >
                                                ＋
                                            </button>
                                        </div>
                                    </div>
                                    <button className="w-full rounded-xl bg-yellow-400 text-black hover:bg-yellow-200 p-2 mt-3 transition" onClick={AddCart}>カートに入れる</button>
                                    <button className="w-full rounded-xl bg-orange-400 text-black hover:bg-orange-200 p-2 mt-3 transition" onClick={() => { setShowModal(true); Purchase(); }}>
                                        購入手続きへ
                                    </button>
                                </div>

                                {/* 説明・在庫カード */}
                                <div className="border rounded-xl p-4 shadow-sm bg-white">
                                    <p className="text-lg font-semibold mb-2">📦 商品情報</p>
                                    <p className="text-gray-700 mb-2">{item.description}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h2>レビュー</h2>
                    {/* レビューリスト */}

                    <DirectCheckoutModal
                        item={item}
                        isOpen={showModal}
                        quantity={selectQuantity}
                        onClose={() => setShowModal(false)}
                    />
                </main>
            ) : (
                <p>商品情報が取得できませんでした。</p>
            )}

            <Footer />
        </div>
    );
};

export default Item;  // ← コンポーネント名と一致！
