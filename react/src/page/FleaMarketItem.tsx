import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";

import { Header } from "../component/Header";
//import { Footer } from '../component/Footer';        // ← .tsx は不要
import DirectCheckoutModal from "../component/DirectCheckoutModal";
import BottomBarPortal from "../component/BottomBarPortal"
import QuestionModal from "../modal/QuestionModal";

import { Content } from "../types/Content";
import { itemImage } from "../types/Content"; // ← itemImage をインポート

import api from "../conf/api";
import { hasAllFlags } from "../conf/function"; // getItemStatusLabels をインポート
import { ITEM__STATUS } from "../conf/config"; // ITEM__STATUS をインポート

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import "swiper/swiper-bundle.css";

// コンポーネント名は大文字で始めるのが慣例
const Item: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [item, setItem] = useState<Content | null>(null);
    const [images, setImages] = useState<itemImage[]>([]);
    const [selectQuantity, setSelectQuantity] = useState(1);
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const [orderFlag, setOrderFlag] = useState(false);
    const navigate = useNavigate();
    const [showQModal, setShowQModal] = useState(false);

    const handleSendQuestion = async (text: string) => {
        if (!item) return;
        await api.post("/items/question", { itemId: item.id, text });
        // 必要ならトースト表示や、店側の通知処理へ
    };

    useEffect(() => {
        if (!id) {
            console.error("ID が取得できませんでした");
            return;
        }
        // ここでAPIから商品情報を取得する処理を追加する
        api
            .get(`/item/get/${id}`)
            .then((res) => {
                if (res.data) {
                    setItem(res.data.item);
                    setImages(res.data.images || []);
                    setOrderFlag(
                        hasAllFlags(res.data.item.status, [
                            ITEM__STATUS.ACCEPTS_ORDER,
                            ITEM__STATUS.HAS_RESTOCK,
                        ])
                    );
                    console.log("商品情報:", res.data.item);
                } else {
                    console.error("商品情報が取得できませんでした");
                }
            })
            .catch((err) => {
                console.error("APIエラー:", err);
            });
    }, [location.search]);

    const decrement = () => {
        if (selectQuantity > 1) {
            setSelectQuantity(selectQuantity - 1);
        } else {
            alert("数量は1以上で入力してください。");
        }
    };

    const increment = () => {
        setSelectQuantity(selectQuantity + 1);
        if (item && selectQuantity >= item.quantity) {
            alert(`在庫は ${item.quantity} 個です。`);
            setSelectQuantity(item.quantity);
            console.log("在庫数を超えています。数量を在庫数に設定しました。");
        }
    };

    const goCheckout = () => {
        if (!item) return alert("商品情報がありません");
        if (selectQuantity <= 0) return alert("数量は1以上で入力してください。");

        // 在庫/取り寄せチェックはお好みで流用
        // ここでは簡略化して遷移
        navigate("/checkout", {
            state: { item, quantity: selectQuantity } // 受け側で location.state を参照
        });
    };

    return (
        <div className="pb-32 md:pb-0">
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
                                <SwiperSlide className="!w-full !h-auto" key={item.id}>
                                    <img className="!mr-0" src={item.url} alt="商品画像" />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                        <div className="item-info">
                            <div className="space-y-4 w-full">
                                {/* 価格・ポイントカード */}
                                <div className="border rounded-xl p-4 shadow-sm bg-white">
                                    <p className="text-lg font-semibold mb-2">
                                        💰 価格とポイント
                                    </p>
                                    <p>
                                        <span className="font-semibold text-gray-600 text-2xl">
                                            {item.price.toLocaleString()}
                                        </span>
                                        円(税込み)
                                    </p>
                                    <p>
                                        <span className="font-semibold text-gray-600 text-2xl">
                                            {item.point.toLocaleString()}
                                        </span>{" "}
                                        pt(全額ポイントで購入)
                                    </p>
                                    <>
                                        <p className="mt-2">
                                            <span className="font-semibold text-gray-600">在庫:</span>{" "}
                                            {item.quantity > 0 ? (
                                                <span className="text-green-600 font-medium">
                                                    {item.quantity} 個
                                                </span>
                                            ) : (
                                                <span className="text-red-500 font-medium">
                                                    在庫切れ{orderFlag ? "(お取り寄せ)" : ""}
                                                </span>
                                            )}
                                        </p>
                                        {orderFlag && item.quantity <= 0 && (
                                            <div className="text-sm text-red-500 mt-1">
                                                ※お届けまでに時間がかかる場合があります。
                                            </div>
                                        )}
                                    </>
                                    <BottomBarPortal>
                                        {/* 数量・カート・購入ボタン固定バー */}
                                        {/* 数量指定はあるやつだけにする */}
                                        <div className=" fixed bottom-0 left-0 right-0 z-50 bg-white shadow-lg h-[130px] p-3 md:static md:shadow-none md:p-0">
                                            <div className="flex items-center justify-between w-full mb-3 md:mb-0">
                                                <span className="text-gray-800 text-base w-16">数量</span>
                                                <div className="flex items-center border border-gray-200 rounded-xl bg-white flex-1 mx-2">
                                                    <input
                                                        type="text"
                                                        value={selectQuantity}
                                                        readOnly
                                                        className="w-full h-10 text-center text-gray-800 bg-white outline-none"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={decrement}
                                                        className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                                                        aria-label="数量を減らす"
                                                    >
                                                        －
                                                    </button>
                                                    <button
                                                        onClick={increment}
                                                        className="w-10 h-10 rounded-xl bg-gray-100 text-black hover:bg-gray-300 transition"
                                                        aria-label="数量を増やす"
                                                    >
                                                        ＋
                                                    </button>
                                                </div>
                                            </div>

                                            {/* ボタン横並び */}
                                            <div className="flex gap-2">
                                                <button
                                                    className="flex-1 rounded-xl bg-yellow-400 text-black hover:bg-yellow-200 p-3 transition font-medium"
                                                    onClick={() => setShowQModal(true)}
                                                >
                                                    質問をする
                                                </button>
                                                <button
                                                    className="flex-1 rounded-xl bg-orange-400 text-black hover:bg-orange-200 p-3 transition font-medium"
                                                    onClick={goCheckout}
                                                >
                                                    購入手続きへ
                                                </button>
                                            </div>
                                        </div>
                                    </BottomBarPortal>
                                </div>

                                {/* 説明・在庫カード */}
                                <div className="border rounded-xl p-4 shadow-sm bg-white">
                                    <p className="text-lg font-semibold mb-2">📦 商品情報</p>
                                    <p className="text-gray-700 mb-2">{item.description}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h2>コメント</h2>
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

            <QuestionModal
                isOpen={showQModal}
                onClose={() => setShowQModal(false)}
                onSend={handleSendQuestion}
                roomTitle={item?.name ? `${item.name} に関するお問い合わせ` : "お問い合わせ"}
                roomSubtitle="通常1営業日以内に返信"
                shopAvatarUrl="/images/shop_avatar.png"   // 任意
                shopOnline
            />
        </div>
    );
};

export default Item; 
