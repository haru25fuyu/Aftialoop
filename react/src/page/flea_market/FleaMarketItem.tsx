import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate, Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";


import { Header } from "../../component/Header";
import BottomBarPortal from "../../component/BottomBarPortal"
import CommentList from "../../component/CommentList";

import QuestionModal from "../../modal/QuestionModal";
import PurchaseRequestModal from "../../modal/PurchaseRequestModal";

import { itemImage, Content } from "../../types/Content";
import { FleaContent, FleaComment, FleaItemDetails } from "../../types/FleaMarket";

import api, { getAccessToken } from "../../conf/api";
import { CONFIG } from "../../conf/config";
import { SHIPPING_FEE_TYPES_MAP } from "../../conf/FleaMarket";
import { getPrefName } from "../../conf/function";

// ★追加: 計算用ヘルパー (一覧画面と同じもの)
const DEFAULT_RATE = 1.00;
const DEFAULT_DEN = 10000; // APIから取れない場合のフォールバック

function safeRate(v: number | null | undefined): number {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_RATE;
    return n;
}

function normalizeRate(rawRate: number, den: number) {
    // レートが2.0より大きいなら整数化済みとみなす
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

    // ★修正1: Math.ceil (切り上げ) → Math.floor (切り捨て)
    // 2000円 ÷ 1.02 = 1960.7... → 1960pt でOKにする
    const needPt = Math.floor((price * den) / scaledRate);

    const usePt = Math.min(point, needPt);

    // ★修正2: 全額払い判定
    let coveredYen;
    if (usePt >= needPt) {
        // 必要ポイント（1960pt）払いきれるなら、計算上0.8円足りなくても「2000円全額OK」とみなす
        coveredYen = price;
    } else {
        // ポイントが足りない場合は、払える分だけ計算
        coveredYen = Math.floor((usePt * scaledRate) / den);
        // 上限キャップ
        coveredYen = Math.min(coveredYen, price);
    }

    const discountYen = Math.max(0, coveredYen - usePt);
    return { discountYen };
}

const Item: React.FC = () => {
    // ... (State定義などは変更なし) ...
    const [openPurchaseModal, setOpenPurchaseModal] = useState(false);
    const [item, setItem] = useState<FleaContent | null>(null);
    const [itemDetails, setItemDetails] = useState<FleaItemDetails | null>(null);
    const [images, setImages] = useState<itemImage[]>([]);
    const [user, setUser] = useState<Content | null>(null);
    const [comments, setComments] = useState<FleaComment[]>([]);
    const [showQModal, setShowQModal] = useState(false);

    // レート分母（詳細APIで返ってこない場合は固定値を使用）
    const [rateDen, setRateDen] = useState<number>(DEFAULT_DEN);

    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isSeller = user && item && String(user.id) === String(item.userId);

    // ... (データ取得などのuseEffectや関数はそのまま) ...
    const handleSendQuestion = async (text: string) => {
        if (!item) return;
        await api.post("/items/question", { itemId: item.id, text });
        alert("質問を送信しました");
        setShowQModal(false);
    };

    useEffect(() => {
        if (!id) return;
        api.get(`/flea-market/item/${id}`).then((res) => {
            if (res.data) {
                setItem(res.data.item);
                setImages(res.data.images || []);
                setRateDen(res.data.rate_den || DEFAULT_DEN);

                if (!res.data.details.animal_details
                    && !res.data.details.supply_details) return;

                setItemDetails({
                    ...res.data.details,
                });
            }
        });
    }, [id, location.search]);

    useEffect(() => {
        const token = getAccessToken();
        if (token && token !== 'undefined') {
            api.post('/customer', {}).then((res) => setUser(res.data.user));
        }
    }, []);

    useEffect(() => {
        if (!id) return;
        api.get(`/flea-market/item/${id}/messages`).then((res) => {
            const list = res.data?.messages ?? [];
            const mapped: FleaComment[] = list.map((m: FleaComment) => ({
                id: String(m.id), itemId: m.itemId, parentMessageId: m.parentMessageId,
                userId: m.userId, userName: m.userName, userIcon: m.userIcon,
                body: m.body, createdAt: Number(m.createdAt) || Date.now(),
            }));
            setComments(mapped);
        });
    }, [id]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        return dateStr.split("T")[0]; // "2026-01-01T00:00:00" -> "2026-01-01"
    };

    const renderSpecs = () => {
        if (!item || !itemDetails) return null;

        const containerClass = "grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm mt-4 p-4 bg-gray-50 rounded-lg";

        if (item.type === "ANIMAL") {
            return (
                <dl className={containerClass}>
                    <div className="col-span-1 md:col-span-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 border-b pb-1">生体情報</div>

                    <DetailRow label="産地" value={itemDetails.animal_details?.locality} />
                    {/* ★修正2: formatDate関数を通して表示 */}
                    <DetailRow label="羽化日" value={formatDate(itemDetails.animal_details?.hatch_date || "")} />
                    <DetailRow label="サイズ" value={itemDetails.animal_details?.size} />
                    <DetailRow label="累代" value={itemDetails.animal_details?.generation} />
                    <DetailRow label="性別" value={
                        itemDetails.animal_details?.sex === "male" ? "オス" :
                            itemDetails.animal_details?.sex === "female" ? "メス" :
                                itemDetails.animal_details?.sex === "pair" ? "ペア" : "不明"
                    } />
                </dl>
            );
        } else if (item.type === "SUPPLY") {
            return (
                <dl className={containerClass}>
                    <div className="col-span-1 md:col-span-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 border-b pb-1">製品情報</div>

                    <DetailRow label="ブランド" value={itemDetails.supply_details?.brand} />
                    <DetailRow label="SKU/型番" value={itemDetails.supply_details?.sku} />
                    <DetailRow label="内容量" value={itemDetails.supply_details?.net_weight_g ? `${itemDetails.supply_details?.net_weight_g}g` : ""} />
                </dl>
            );
        }
        return null;
    };

    const ActionButtons = ({ className = "" }: { className?: string }) => (
        <div className={`flex gap-3 ${className}`}>
            <button className="flex-1 bg-gray-100 text-gray-800 rounded-xl font-bold py-3 hover:bg-gray-200 transition-colors" onClick={() => setShowQModal(true)}>
                質問・コメント
            </button>
            {isSeller ? (
                <button className="flex-[2] bg-gray-800 text-white rounded-xl font-bold py-3 hover:bg-gray-700 transition-colors shadow-lg shadow-gray-200" onClick={() => navigate(`/flea-market/${item!.id}/edit`)}>
                    商品を編集する
                </button>
            ) : (
                <button className="flex-[2] bg-red-600 text-white rounded-xl font-bold py-3 hover:bg-red-700 transition-colors shadow-lg shadow-red-100 disabled:opacity-50 disabled:bg-gray-400" onClick={() => setOpenPurchaseModal(true)} disabled={item!.quantity <= 0}>
                    {item!.quantity > 0 ? "購入手続きへ" : "売り切れ"}
                </button>
            )}
        </div>
    );

    if (!item) return <div className="p-20 text-center text-gray-500">読み込み中...</div>;

    const rawRate = safeRate(item.seller_rate); // item.seller_rate が存在すると仮定
    const { num, den } = normalizeRate(rawRate, rateDen);
    const isRateUp = num > den;
    const { discountYen } = user
        ? calcRateDiscount(item.price, user.point, rawRate, rateDen)
        : { discountYen: 0 };

    return (
        <div className="bg-white min-h-screen pb-32 md:pb-10">
            <Header />

            <main className="max-w-6xl mx-auto md:mt-8 md:px-6 w-full px-4">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-0 md:gap-12 lg:gap-16 items-start">
                    {/* ① 左カラム：画像エリア */}
                    <div className="w-full md:sticky md:top-24 bg-gray-50 md:bg-transparent md:rounded-2xl overflow-hidden">
                        <Swiper
                            modules={[Pagination, Navigation]}
                            spaceBetween={0}
                            slidesPerView={1}
                            pagination={{ clickable: true }}
                            navigation
                            loop={images.length >= 2}
                            style={{ width: "100%", height: "auto" }}
                            className="w-full aspect-square md:rounded-2xl md:border border-gray-100 shadow-sm bg-white"
                        >
                            {images.length > 0 ? images.map((img) => (
                                <SwiperSlide key={img.id} className="!w-full">
                                    <div className="w-full h-full flex items-center justify-center bg-white">
                                        <img
                                            className="!w-full !h-full object-contain"
                                            style={{ width: "100%", height: "100%" }}
                                            src={CONFIG.BASE_URL + img.url}
                                            alt={item.name}
                                        />
                                    </div>
                                </SwiperSlide>
                            )) : (
                                <SwiperSlide>
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-200 aspect-square">NO IMAGE</div>
                                </SwiperSlide>
                            )}
                        </Swiper>
                    </div>

                    {/* ② 右カラム：商品情報 */}
                    <div className="px-0 py-6 md:p-0 space-y-4 w-full">
                        <div className="border-b border-gray-100 pb-6">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-4 break-words">
                                {item.name}
                            </h1>
                            <div className="flex items-center gap-4">
                                <span className="text-3xl md:text-4xl font-bold text-red-600">
                                    ¥{item.price.toLocaleString()}
                                </span>
                                <span className="text-sm px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                    {SHIPPING_FEE_TYPES_MAP.find(fee => fee.id === item.shippingFeeType)?.label || "送料情報なし"}
                                </span>
                            </div>
                        </div>

                        {isRateUp && item.quantity > 0 && (
                            <div className="flex items-center gap-2">
                                {discountYen > 0 ? (
                                    <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                                        ポイント利用で {discountYen.toLocaleString()}円お得
                                    </span>
                                ) : (
                                    <span className="text-sm font-bold text-emerald-600 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
                                        ポイントでおトク
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="hidden md:block">
                            <ActionButtons />
                        </div>

                        <section className="rounded-xl p-4 bg-white">
                            <h3 className="text-base font-bold text-gray-900 mb-3">商品の詳細</h3>
                            <div className="grid grid-cols-1 gap-y-3 text-sm">
                                <DetailRow label="カテゴリ" value={item.type === "ANIMAL" ? "生体" : "用品"} />
                                <DetailRow label="在庫数" value={`${item.quantity} 個`} />
                                <DetailRow label="発送元の地域" value={getPrefName(item.shipFrom)} />
                                <DetailRow label="発送日の目安" value={item.shipsWithinDays ? `${item.shipsWithinDays}日以内` : "未定"} />
                            </div>
                            {renderSpecs()}
                        </section>

                        <section className="rounded-xl p-4 bg-white " >
                            <h3 className="text-base font-bold text-gray-900 mb-3">商品説明</h3>
                            <div className="text-sm md:text-base text-gray-700 whitespace-pre-wrap leading-relaxed break-words">
                                {item.description || "説明はありません。"}
                            </div>
                        </section>

                        {/* 出品者情報エリア: section を Link に変更 */}
                        <Link
                            to={`/user/profile/${item.userId}`}
                            className="border rounded-xl p-4 bg-white shadow-sm flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer block"
                        >
                            <img
                                src={item.seller_icon_url ? CONFIG.BASE_URL + item.seller_icon_url : "/icons/default.png"}
                                alt={item.seller_name}
                                className="w-14 h-14 rounded-full object-cover border"
                            />
                            <div className="flex-1">
                                <p className="text-base font-bold">{item.seller_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex text-orange-400 text-sm">★★★★★</div>
                                    {/* 評価数などは後でAPIから取れたら入れる、今は仮でOK */}
                                    <span className="text-xs text-gray-500">25 出品</span>
                                </div>
                            </div>
                            <span className="text-sm text-gray-500 font-bold px-2">＞</span>
                        </Link>

                        <section className="rounded-xl p-4 bg-white">
                            <h3 className="text-base font-bold text-gray-900 mb-3">コメント ({comments.length})</h3>
                            <div className="border rounded-xl bg-gray-50 overflow-hidden max-h-[400px] flex flex-col">
                                <div className="flex-1 overflow-y-auto p-4">
                                    <CommentList comments={comments} sellerId={item.userId} />
                                </div>
                                <div className="p-3 border-t bg-white text-center">
                                    <button className="text-sm text-gray-500 hover:text-gray-800 underline" onClick={() => setShowQModal(true)}>
                                        コメントを投稿する
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* モバイル用固定ボトムバー 用スペーサー*/}
            <div className="md:hidden h-24"></div>

            <BottomBarPortal>
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-[50] bg-white border-t p-4 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    <ActionButtons />
                </div>
            </BottomBarPortal>

            <PurchaseRequestModal
                open={openPurchaseModal}
                itemId={item.id}
                onClose={() => setOpenPurchaseModal(false)}
                onSubmit={async (payload) => {
                    try {
                        const res = await api.post("/flea-market/purchase-requests/create", payload);
                        if (res.data && res.data.id) navigate("/flea-market/transactions/" + res.data.id);
                    } catch (e) {
                        alert("購入リクエストに失敗しました");
                        console.error(e);
                    }
                }}
            />

            <QuestionModal
                isOpen={showQModal}
                onClose={() => setShowQModal(false)}
                onSend={handleSendQuestion}
                roomTitle={item?.name || "質問"}
                roomSubtitle="出品者に質問・コメントを送る"
                shopAvatarUrl={item?.seller_icon_url || ""}
                shopOnline={false}
                item={item}
            />
        </div>
    );
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    if (!value) return null;
    return (
        <div className="flex border-b border-gray-100 last:border-0 py-3">
            <dt className="w-32 text-gray-500 font-medium shrink-0">{label}</dt>
            <dd className="text-gray-900 font-medium break-words">{value}</dd>
        </div>
    );
}

export default Item;