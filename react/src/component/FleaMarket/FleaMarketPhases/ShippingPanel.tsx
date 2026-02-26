import React from "react";
import { Truck, Package, CheckCircle, ChevronDown, Clock, MapPin, UserCheck, Star } from "lucide-react";

import {
    SHIPPING_CARRIERS,
    SHIPPING_CARRIER_OPTIONS,
    ChangeTxStatustoShipped,
    RateTransactionByBuyer,
    CompleteTransactionBySeller
} from "../../../conf/FleaMarket";

import { FleaThreadResponse } from "../../../types/FleaMarket";
import { Address } from "../../../types/Address";

import FleaReviewModal from "../../../modal/FleaReviewModal";
import { TransactionChat } from "../../TransactionChat";
import { LoadingButton } from "../../LoadingButton";



// 日付フォーマット用
function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
    }).format(d);
}

// 配送業者コードからラベルを取得するヘルパー
function getCarrierLabel(key: string | null | undefined) {
    if (!key) return "指定なし";
    const found = SHIPPING_CARRIER_OPTIONS.find(opt => opt.id === key);
    return found ? found.label : key;
}

export default function ShippingPanel({
    data,
    myUserId,
    onChanged,
}: {
    data: FleaThreadResponse;
    myUserId: string;
    onChanged: () => void;
}) {
    const { transaction: tx, role, address } = data;

    // --- State ---

    // 出品者用
    const [carrier, setCarrier] = React.useState<SHIPPING_CARRIERS | "">("");
    const [trackingNumber, setTrackingNumber] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // 購入者用（評価・モーダル）
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    // nullチェック (対象ステータスを拡張)
    if (!tx || !["PAID", "SHIPPED", "RATED_BY_BUYER"].includes(tx.status)) return null;

    // 出品者: 発送通知
    const handleShip = async () => {
        if (!carrier) {
            alert("配送業者を選択してください");
            return;
        }
        if (!confirm("商品を発送しましたか？購入者に通知を送ります。")) return;

        setIsSubmitting(true);
        try {
            await ChangeTxStatustoShipped(
                carrier,
                trackingNumber,
                tx?.id || 0,
            );
            alert("発送通知を送信しました");
            onChanged();
        } catch (err) {
            alert("エラーが発生しました");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    }

    // 購入者: 取引完了 (モーダルから呼ばれる)
    //const handleRateSubmit = async (rating: number, comment: string) => {
    //
    //    // API呼び出し
    //    await RateTransactionByBuyer(tx.id, rating, comment);
    //
    //    setIsModalOpen(false); // 成功したら閉じる
    //    alert("取引が完了しました！お疲れ様でした。");
    //    onChanged();
    //};

    // 2. 評価送信 (共通モーダルから呼ばれる)
    const handleReviewSubmit = async (rating: number, comment: string) => {
        try {
            if (isBuyer) {
                // 購入者のアクション: 評価して待機状態へ
                await RateTransactionByBuyer(tx.id, rating, comment);
                alert("評価を送信しました。出品者からの評価をお待ちください。");
            } else if (isSeller) {
                // 出品者のアクション: 評価して取引完了へ
                await CompleteTransactionBySeller(tx.id, rating, comment);
                alert("取引が完了しました！売上金が反映されました。");
            }

            setIsModalOpen(false);
            onChanged();
        } catch (err) {
            alert("エラーが発生しました");
            console.error(err);
        }
    };
    const isSeller = role === "SELLER";
    const isBuyer = role === "BUYER";

    // ステータスフラグ
    const isShipped = tx.status === "SHIPPED";
    const isRatedByBuyer = tx.status === "RATED_BY_BUYER"; // ★中間状態

    return (
        <>
            {data.transaction && myUserId && (
                <div className="mt-8">
                    <TransactionChat
                        purchase_request_id={data.transaction.purchase_request_id.toString()}
                        myUserId={myUserId}
                    />
                </div>
            )}
            <div className="rounded-2xl border border-gray-300 bg-white shadow-sm overflow-hidden">
                {/* --- ヘッダー領域 --- */}
                <div className="text-center py-4 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-black flex items-center justify-center gap-2">
                        {/* ステータスに応じてヘッダー文言を変える */}
                        {isRatedByBuyer ? (
                            <>
                                <UserCheck size={20} />
                                {isSeller ? "購入者を評価してください" : "出品者の評価待ち"}
                            </>
                        ) : isShipped ? (
                            <>
                                <Truck size={20} />
                                {isSeller ? "発送済みです" : "商品が発送されました"}
                            </>
                        ) : (
                            <>
                                <Package size={20} />
                                {isSeller ? "商品を発送してください" : "発送をお待ちください"}
                            </>
                        )}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 px-4">
                        {isShipped ? (
                            isSeller
                                ? "購入者の受取評価をお待ちください。"
                                : "商品が届いたら中身を確認し、受取評価を行ってください。"
                        ) : (
                            isSeller
                                ? "梱包して指定の配送方法で発送しましょう。"
                                : "出品者が発送準備中です。"
                        )}
                    </p>
                </div>

                {/* --- 出品者 (SELLER) の表示 --- */}
                {isSeller && (
                    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        {/* 住所情報は常に表示 */}
                        <AddressCard address={address} title="配送先住所" />

                        {/* ステータスに応じた表示切り替え */}
                        {/* A. 中間状態: 購入者が評価済み -> 出品者の評価待ち */}
                        {isRatedByBuyer && (
                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 shadow-sm">
                                <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
                                    <CheckCircle size={18} />
                                    購入者が受取評価を完了しました
                                </h4>
                                <p className="text-sm text-orange-700 mb-4 leading-relaxed">
                                    購入者が商品を受け取り、評価を行いました。<br />
                                    <strong>あなたの評価を送信すると、取引が完了し売上金が反映されます。</strong>
                                    <span className="block mt-1 text-xs opacity-70">
                                        ※相互評価のため、あなたが評価するまで相手の評価内容は分かりません。
                                    </span>
                                </p>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="w-full py-3 rounded-xl bg-black text-white font-bold hover:bg-gray-800 transition shadow-md flex items-center justify-center gap-2"
                                >
                                    <Star size={18} className="fill-white" />
                                    購入者を評価して取引を完了する
                                </button>
                            </div>
                        )}
                        {isShipped && !isRatedByBuyer && (
                            // 発送済み：入力内容の確認表示 (Read Only)
                            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-black border-b border-gray-100 pb-2">
                                    <CheckCircle size={16} /> 発送情報
                                </div>
                                <div className="grid grid-cols-1 gap-3 text-sm">
                                    <div>
                                        <div className="text-gray-500 text-xs">配送業者</div>
                                        <div className="font-medium mt-0.5">{getCarrierLabel(tx.shipping_carrier as SHIPPING_CARRIERS | undefined)}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-xs">追跡番号</div>
                                        <div className="font-medium mt-0.5 tracking-wider">
                                            {tx.tracking_number || "なし"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-xs">発送日時</div>
                                        <div className="font-medium mt-0.5">
                                            {formatDate(tx.shipped_at)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* B. 未発送 */}
                        {!isShipped && !isRatedByBuyer && (
                            // 未発送：入力フォーム (Form)
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-black mb-1">
                                        配送業者 <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none bg-white font-medium appearance-none"
                                            value={carrier}
                                            onChange={(e) => setCarrier(e.target.value as SHIPPING_CARRIERS)}
                                        >
                                            <option value="" disabled>選択してください</option>
                                            {SHIPPING_CARRIER_OPTIONS.map((opt) => (
                                                <option key={opt.id} value={opt.id}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-black mb-1">
                                        追跡番号 (任意)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="1234-5678-9012"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none bg-white font-medium"
                                        value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value)}
                                    />
                                </div>

                                <LoadingButton
                                    onClick={handleShip}
                                    disabled={!carrier} // 配送業者が未選択の時は押せない
                                    loading={isSubmitting} // ★これでくるくる回る＆連打防止
                                    className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Truck size={20} />
                                    商品を発送したので通知する
                                </LoadingButton>
                            </div>
                        )}
                    </div>
                )}

                {/* --- 購入者 (BUYER) の表示 --- */}
                {isBuyer && (
                    <div className="p-4">
                        {/* A. 中間状態: 自分は評価済み -> 待機 */}
                        {isRatedByBuyer && (
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col items-center text-center gap-3">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm">
                                    <Clock size={24} className="text-gray-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">評価を送信しました</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        出品者からの評価をお待ちください。<br />
                                        双方が評価を終えると取引完了となります。
                                    </p>
                                </div>
                            </div>
                        )}
                        {/* B. 発送済み -> 受取評価ボタン (既存) */}
                        {isShipped && !isRatedByBuyer && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                {/* 配送情報 */}
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                        <Truck size={18} /> 配送状況
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500 text-xs block">配送業者</span>
                                            <span className="font-medium">{getCarrierLabel(tx.shipping_carrier as SHIPPING_CARRIERS | undefined)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs block">追跡番号</span>
                                            <span className="font-mono font-medium">{tx.tracking_number || "なし"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* アクション: モーダルを開くボタン */}
                                <div className="text-center space-y-3">
                                    <p className="text-sm text-gray-600">
                                        商品の中身を確認し、問題がなければ<br />
                                        受取評価を行って取引を完了してください。
                                    </p>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="w-full py-4 rounded-xl bg-black text-white font-bold shadow-md hover:bg-gray-800 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={20} />
                                        商品を受け取ったので評価する
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* C. 未発送 (既存) */}
                        {!isShipped && !isRatedByBuyer && (
                            // 未発送時の表示
                            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm text-black flex items-start gap-3">
                                <Clock className="shrink-0 text-gray-500" size={20} />
                                <div className="space-y-1">
                                    <p className="font-medium">
                                        発送期限: {formatDate(tx?.paid_at ? tx.paid_at : "")} から数日以内
                                    </p>
                                    <p className="text-gray-600">
                                        出品者からの発送通知をお待ちください。
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ★ コンポーネント化したモーダル */}
            <FleaReviewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleReviewSubmit}
            />
        </>
    );
}

function AddressCard({ address, title }: { address: Address; title: string }) {
    if (!address) return null;
    return (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-2 text-black text-sm font-semibold">
                <MapPin size={16} />
                {title}
            </div>
            <div className="text-sm text-black space-y-1 pl-6">
                <div className="font-bold">〒 {address.post_code}</div>
                <div>{address.pref} {address.address1} {address.address2}</div>
                <div>{address.address3}</div>
                <div className="pt-1 font-medium">{address.name} 様</div>
            </div>
        </div>
    );
}