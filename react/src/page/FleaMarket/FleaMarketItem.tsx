import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";

import { Header } from "../../component/Header";
//import { Footer } from '../component/Footer';        // ← .tsx は不要
import BottomBarPortal from "../../component/BottomBarPortal"
import CommentList from "../../component/CommentList";
import { PriceWithPerks } from "../../component/PriceWithPerks";

import QuestionModal from "../../modal/QuestionModal";

import { fleaContent, FleaComment, itemImage, Content } from "../../types/Content";

import api, { getAccessToken } from "../../conf/api";
import { CONFIG } from "../../conf/config";
import { getPrefName } from "../../conf/function"; // getItemStatusLabels をインポート
import { ITEM__STATUS } from "../../conf/config"; // ITEM__STATUS をインポート

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import "swiper/swiper-bundle.css";


const Item: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [item, setItem] = useState<fleaContent | null>(null);
    const [images, setImages] = useState<itemImage[]>([]);
    const [selectQuantity, setSelectQuantity] = useState(1);
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const [orderFlag, setOrderFlag] = useState(false);
    const navigate = useNavigate();
    const [showQModal, setShowQModal] = useState(false);
    const [user, setUser] = useState<Content | null>(null);

    const [comments, setComments] = useState<FleaComment[]>([]);

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
        api.get(`/flea-market/item/${id}`)
            .then((res) => {
                if (res.data) {
                    setItem(res.data.item);
                    setImages(res.data.images || []);
                    /*setOrderFlag(
                        hasAllFlags(res.data.item.status, [
                            ITEM__STATUS.ACCEPTS_ORDER,
                            ITEM__STATUS.HAS_RESTOCK,
                        ])
                    );*/
                    console.log("商品情報:", res.data);
                    console.log("画像情報:", res.data.images);

                    const token = getAccessToken();
                    if (token && token !== 'undefined') {
                        api.post('/customer', {})
                            .then((res) => {
                                setUser(res.data.user);
                            }).catch((err) => {
                                console.error(err);
                            });
                    }
                } else {
                    console.error("商品情報が取得できませんでした");
                }
            })
            .catch((err) => {
                console.error("APIエラー:", err);
            });
    }, [location.search]);

    useEffect(() => {
        api.get(`/flea-market/item/${item?.id}/messages`)
            .then((res) => {
                const list = res.data?.messages ?? [];

                const mapped: FleaComment[] = list.map((m: FleaComment) => ({
                    id: String(m.id),
                    itemId: m.itemId,
                    parentMessageId: m.parentMessageId,
                    userId: m.userId,
                    userName: m.userName,
                    userIcon: m.userIcon,
                    body: m.body,
                    createdAt: Number(m.createdAt) || Date.now(),
                }));

                setComments(mapped);
                console.log("loaded messages", res);
            })
            .catch((err) => {
                console.error("failed to load messages", err);
            });
    }, [item]);

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
        navigate(`/flea-market/checkout/${item.id}`, {
            state: { quantity: selectQuantity }
        });
    };

    return (
        <div className="pb-32 md:pb-0">
            <Header />

            {item && (
                <main className="pb-24"> {/* 下に固定ボタン置くのでちょい余白 */}
                    {/* ① 画像スライダー */}

                    <Swiper
                        modules={[Pagination, Navigation]}
                        direction="horizontal"
                        spaceBetween={0}
                        slidesPerView={1}
                        pagination={{ clickable: true }}
                        navigation
                        loop={images.length >= 2}
                        speed={500}
                    >
                        {images.map((img) => (
                            <SwiperSlide className="!w-full !h-auto" key={img.id}>
                                <img
                                    className="!w-full"
                                    src={CONFIG.BASE_URL + img.url}
                                    alt="商品画像"
                                />
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    <div className="px-1 py-4 space-y-4">
                        {/* ② タイトル */}
                        <h1 className="text-lg font-semibold leading-snug">
                            {item.name}
                        </h1>

                        {/* ③ 価格＋フリマ情報（ヤフオクの「カテゴリ〜発送までの日数」ゾーン） */}
                        <section className="border rounded-xl p-4 shadow-sm bg-white text-sm">
                            {/* 価格 */}
                            <PriceWithPerks
                                price={item.price}
                                user={user}
                                num={0.02}
                            />
                            <div className="mb-3">
                                <span className="text-2xl font-semibold">
                                    {item.price.toLocaleString()}
                                </span>
                                <span className="ml-1">円</span>
                                <span className="ml-2 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                    {item.shippingFeeType === 0 ? "送料込み" : "着払い"}
                                </span>
                            </div>

                            {/* 情報テーブル風 */}
                            <dl className="space-y-1">
                                <div className="flex">
                                    <dt className="w-28 text-gray-500">カテゴリ</dt>
                                    <dd className="flex-1 text-blue-500 text-xs">
                                        {/* TODO: カテゴリパンくず入れる */}
                                        生き物 ＞ 昆虫　など
                                    </dd>
                                </div>
                                <div className="flex">
                                    <dt className="w-28 text-gray-500">商品の状態</dt>
                                    <dd className="flex-1">
                                        {/* まだ状態カラムないなら固定文言でOK */}
                                        未設定
                                    </dd>
                                </div>
                                <div className="flex">
                                    <dt className="w-28 text-gray-500">個数</dt>
                                    <dd className="flex-1">
                                        {item.isMultiPurchasable
                                            ? `${item.quantity} 個`
                                            : item.quantity > 0
                                                ? "1個"
                                                : "売り切れ"}
                                    </dd>
                                </div>
                                <div className="flex">
                                    <dt className="w-28 text-gray-500">発送までの日数</dt>
                                    <dd className="flex-1">
                                        {item.shipsWithinDays
                                            ? `支払い後 ${item.shipsWithinDays} 日以内に発送`
                                            : "未設定"}
                                    </dd>
                                </div>
                                <div className="flex">
                                    <dt className="w-28 text-gray-500">発送元の地域</dt>
                                    <dd className="flex-1">
                                        {getPrefName(item.shipFrom)} {/* さっきの PREFS から取得 */}
                                    </dd>
                                </div>
                            </dl>
                        </section>

                        {/* ④ 商品説明 */}
                        <section className="border rounded-xl p-4 shadow-sm bg-white">
                            <p className="text-sm font-semibold mb-2">📦 商品説明</p>
                            <p className="text-gray-700 whitespace-pre-line text-sm">
                                {item.description || "説明は登録されていません。"}
                            </p>
                        </section>

                        {/* ⑥ 出品者情報（下の方にヤフオク/メルカリ風で置く） */}
                        <section className="border rounded-xl p-3 shadow-sm bg-white flex items-center gap-3">
                            <img
                                src={
                                    item.seller_icon_url
                                        ? CONFIG.BASE_URL + item.seller_icon_url
                                        : "/icons/default.png"
                                }
                                alt={item.seller_name}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-medium">{item.seller_name}</p>
                                <p className="text-xs text-gray-500">フリマ出品者</p>
                            </div>
                            {/* 将来：評価や本人確認バッジ */}
                        </section>

                        {/* ⑤ コメント（ここは今のまま） */}
                        <section className="border rounded-xl p-3 shadow-sm bg-white flex flex-col h-[300px] overflow-hidden">
                            <h2 className="text-sm font-semibold mb-2 shrink-0">コメント</h2>

                            {/* ここがスクロール領域 */}
                            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1">
                                <CommentList comments={comments} sellerId={item.userId} />
                            </div>
                        </section>

                    </div>

                    {/* ⑦ 下部固定バー：質問 / 購入 */}
                    <BottomBarPortal>
                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.08)] p-3 flex gap-2">
                            <button
                                className="flex-1 rounded-xl bg-yellow-400 text-black hover:bg-yellow-300 p-3 text-sm font-medium"
                                onClick={() => setShowQModal(true)}
                            >
                                質問をする
                            </button>
                            <button
                                className="flex-1 rounded-xl bg-orange-400 text-black hover:bg-orange-300 p-3 text-sm font-medium"
                                onClick={goCheckout}
                                disabled={item.quantity <= 0}
                            >
                                {item.quantity > 0 ? "購入手続きへ" : "売り切れ"}
                            </button>
                        </div>
                    </BottomBarPortal>

                    {/* 直接購入モーダルはそのまま */}
                </main >
            )}


            <QuestionModal
                isOpen={showQModal}
                onClose={() => setShowQModal(false)}
                onSend={handleSendQuestion}
                roomTitle={item?.name ? `${item.name} ` : "お問い合わせ"}
                roomSubtitle="通常1営業日以内に返信"
                shopAvatarUrl={item?.seller_icon_url ? item?.seller_icon_url : ""}   // 任意
                shopOnline
                item={item || null}
            />
        </div >
    );
};

export default Item; 
