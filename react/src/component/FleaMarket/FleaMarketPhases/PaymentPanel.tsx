import { useState, useEffect, useMemo } from "react";
import api from "../../../conf/api";

import { FleaThreadResponse } from "../../../types/FleaMarket";
import { Customer } from "../../../types/Content";
import { FleaContent } from "../../../types/FleaMarket";
import { Payment } from "../../../types/Payment";

import SquarePayment from "../../../modal/EditPayment";

import { TransactionChat } from "../../TransactionChat";
// キャンセルボタンをインポート
import { CancelTransactionButton } from "../../CancelTransactionButton";

// ---------------------------------------------------------
// 型定義の拡張 (any回避)
// ---------------------------------------------------------
interface ExtendedItem extends Omit<FleaContent, 'seller_rate'> {
    SellerRate?: number | string;
    sellerRate?: number | string;
    seller_rate?: number | string;
    seller_rate_value?: number | string;
    seller_discount_rate?: number | string;
    additional_discount_rate?: number | string;
    discount_rate?: number | string;
}

// ---------------------------------------------------------
// ヘルパー関数
// ---------------------------------------------------------
const cn = (...xs: Array<string | false | undefined | null>) => xs.filter(Boolean).join(" ");
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const toNum = (v: number | string | null | undefined) => {
    if (v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const yenFloor = (n: number) => Math.floor(n);
const yenCeil = (n: number) => Math.ceil(n);


export default function PaymentPanel({
    data,
    myUserId,
    onChanged,
}: {
    data: FleaThreadResponse;
    myUserId: string;
    onChanged: () => void;
}) {
    const { transaction: tx, item } = data;

    // ---------------------------------------------------------
    // State
    // ---------------------------------------------------------
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [paymentList, setPaymentList] = useState<Payment[]>([]);
    const [selectCard, setSelectCard] = useState<string>("");

    const [pointMode, setPointMode] = useState<"full" | "partial" | "none">("full");
    const [usePoints, setUsePoints] = useState(0);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [reloadTrigger, setReloadTrigger] = useState(0);

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    // ---------------------------------------------------------
    // Effects: ユーザー情報（ポイント・カード）の取得
    // ---------------------------------------------------------
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const [custRes, cardRes] = await Promise.all([
                    api.post("customer"),
                    api.post("/card/list")
                ]);

                if (custRes.data.user) {
                    setCustomer(custRes.data.user);
                    if (custRes.data.user.defaultCard) {
                        setSelectCard(custRes.data.user.defaultCard);
                    }
                }
                if (cardRes.data.card) {
                    setPaymentList(cardRes.data.card);
                }
            } catch (err) {
                console.error("ユーザー情報の取得に失敗", err);
                setError("ユーザー情報の取得に失敗しました");
            }
        };

        loadUserData();
    }, [reloadTrigger]);

    // ---------------------------------------------------------
    // Computed: 金額計算ロジック
    // ---------------------------------------------------------
    const computed = useMemo(() => {
        if (!tx || !item) return null;

        const extItem = item as unknown as ExtendedItem;

        const baseTotalYen = tx.price_item + tx.price_shipping;
        const customerPoint = toNum(customer?.point);

        const rawSellerRate =
            toNum(extItem.seller_rate) ||
            toNum(extItem?.sellerRate) ||
            toNum(extItem.SellerRate) ||
            toNum(extItem.seller_rate_value) ||
            1;

        const sellerRate = Math.max(0.000001, rawSellerRate);

        const rawDiscountRate =
            toNum(extItem.seller_discount_rate) ||
            toNum(extItem.additional_discount_rate) ||
            toNum(extItem.discount_rate) ||
            0;
        const sellerDiscountRate = clamp(rawDiscountRate, 0, 100);

        const yenToPoints = (yen: number) => yenCeil(yen / sellerRate);
        const pointsToYen = (pt: number) => yenFloor(pt * sellerRate);

        const requiredPointsFull = yenToPoints(baseTotalYen);
        const maxUsablePoints = Math.min(customerPoint, requiredPointsFull);

        const safeUsePoints =
            pointMode === "full"
                ? maxUsablePoints
                : pointMode === "none"
                    ? 0
                    : clamp(toNum(usePoints), 0, maxUsablePoints);

        const coveredYenByPoints = Math.min(baseTotalYen, pointsToYen(safeUsePoints));
        const cashBeforeDiscount = Math.max(0, baseTotalYen - coveredYenByPoints);
        const discountAmountYen = yenFloor((cashBeforeDiscount * sellerDiscountRate) / 100);
        const cardChargeAmountYen = Math.max(0, cashBeforeDiscount - discountAmountYen);
        const remainingPoints = Math.max(0, customerPoint - safeUsePoints);

        return {
            baseTotalYen,
            customerPoint,
            maxUsablePoints,
            safeUsePoints,
            coveredYenByPoints,
            discountAmountYen,
            cardChargeAmountYen,
            remainingPoints,
            sellerRate,
        };
    }, [tx, item, customer?.point, pointMode, usePoints]);

    // pointMode 切替時の初期化
    useEffect(() => {
        if (pointMode === "partial" && computed) {
            setUsePoints(computed.maxUsablePoints);
        } else {
            setUsePoints(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pointMode]);


    // ---------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------
    const handlePay = async () => {
        if (!computed || !tx) return;
        setError("");

        const cardChargeAmount = computed.cardChargeAmountYen;

        if ((pointMode === "partial" || pointMode === "none") && cardChargeAmount > 0 && !selectCard) {
            setError("クレジットカードを選択してください。");
            return;
        }

        setBusy(true);
        try {
            await api.post(`/flea-market/transactions/${tx.id}/pay`, {
                card_id: cardChargeAmount > 0 ? selectCard : null,
                use_points: computed.safeUsePoints,
                payment_amount: cardChargeAmount,
            });

            onChanged();
        } catch (e) {
            console.error(e);
            setError("決済処理に失敗しました。");
        } finally {
            setBusy(false);
        }
    };


    if (!tx || !item || !computed) return <div className="p-4 text-gray-500">読み込み中...</div>;

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
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-gray-800">支払い設定</h3>
                </div>

                <div className="p-4 space-y-6">

                    {/* 支払い内訳 */}
                    <section className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm">
                        <div className="flex justify-between items-baseline">
                            <span className="text-gray-600">お支払い合計</span>
                            <span className="font-bold text-base">¥{computed.baseTotalYen.toLocaleString()}</span>
                        </div>

                        <div className="border-t border-gray-200 my-2 pt-2 space-y-2">
                            <div className="flex justify-between items-baseline">
                                <span className="text-gray-600">ポイント充当</span>
                                <span>-{computed.coveredYenByPoints.toLocaleString()}円</span>
                            </div>
                            {computed.sellerRate !== 1 && (
                                <div className="text-right text-xs text-gray-400">
                                    (レート: {computed.sellerRate}円/pt)
                                </div>
                            )}

                            {computed.discountAmountYen > 0 && (
                                <div className="flex justify-between items-baseline text-green-600">
                                    <span>割引</span>
                                    <span>-¥{computed.discountAmountYen.toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-baseline pt-2 border-t border-gray-300 font-bold">
                            <span className="text-gray-800">カード請求額</span>
                            <span className="text-blue-600 text-lg">¥{computed.cardChargeAmountYen.toLocaleString()}</span>
                        </div>
                    </section>

                    {/* 支払い方法選択 */}
                    <section className="bg-gray-50 p-4 rounded-xl space-y-2 text-smnisosdou">
                        <h4 className="text-sm font-semibold text-gray-700">ポイント・カード利用設定</h4>

                        {/* 全額ポイント */}
                        {computed.baseTotalYen <= computed.customerPoint && (
                            <label
                                className={cn(
                                    "block cursor-pointer rounded-lg border p-3 transition",
                                    pointMode === "full" ? "border-blue-600 ring-1 ring-blue-100 bg-blue-50/20" : "hover:bg-gray-50"
                                )}
                                onClick={() => setPointMode("full")}
                            >
                                <div className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        checked={pointMode === "full"}
                                        onChange={() => setPointMode("full")}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="font-semibold text-sm">全額ポイント</div>
                                        <div className="text-xs text-gray-500">残高: {computed.customerPoint.toLocaleString()}pt</div>
                                    </div>
                                </div>
                            </label>
                        )}

                        {/* 一部ポイント */}
                        <label
                            className={cn(
                                "block cursor-pointer rounded-lg border p-3 transition",
                                pointMode === "partial" ? "border-blue-600 ring-1 ring-blue-100 bg-blue-50/20" : "hover:bg-gray-50"
                            )}
                            onClick={() => setPointMode("partial")}
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="radio"
                                    checked={pointMode === "partial"}
                                    onChange={() => setPointMode("partial")}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-semibold text-sm">ポイント ＋ カード</div>
                                    <div className="text-xs text-gray-500">
                                        利用可能: {computed.maxUsablePoints.toLocaleString()}pt
                                    </div>

                                    {pointMode === "partial" && (
                                        <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="number"
                                                className="border rounded px-2 py-1 w-24 text-right text-sm"
                                                value={usePoints}
                                                min={0}
                                                max={computed.maxUsablePoints}
                                                onChange={(e) => {
                                                    const n = Number(e.target.value);
                                                    setUsePoints(Number.isFinite(n) ? n : 0);
                                                }}
                                                onBlur={() => setUsePoints(clamp(toNum(usePoints), 0, computed.maxUsablePoints))}
                                            />
                                            <span className="text-sm">pt</span>
                                            <button
                                                type="button"
                                                className="text-xs text-blue-600 hover:underline"
                                                onClick={() => setUsePoints(computed.maxUsablePoints)}
                                            >
                                                最大
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </label>

                        {/* カードのみ */}
                        <label
                            className={cn(
                                "block cursor-pointer rounded-lg border p-3 transition",
                                pointMode === "none" ? "border-blue-600 ring-1 ring-blue-100 bg-blue-50/20" : "hover:bg-gray-50"
                            )}
                            onClick={() => setPointMode("none")}
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="radio"
                                    checked={pointMode === "none"}
                                    onChange={() => setPointMode("none")}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-semibold text-sm">カードのみ</div>
                                    <div className="text-xs text-gray-500">ポイントを利用しません</div>
                                </div>
                            </div>
                        </label>
                    </section>

                    {/* カード選択 */}
                    {pointMode !== "full" && computed.cardChargeAmountYen > 0 && (
                        <section className="space-y-3 pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-gray-700">使用するカード</h4>
                                <button
                                    type="button"
                                    className="text-xs text-blue-600 hover:underline"
                                    onClick={() => setIsPaymentModalOpen(true)}
                                >
                                    ＋カードを追加
                                </button>
                            </div>

                            {paymentList.length > 0 ? (
                                <div className="space-y-2">
                                    {paymentList.map((p) => (
                                        <label
                                            key={p.id}
                                            className={cn(
                                                "flex items-center gap-3 cursor-pointer rounded-lg border p-3 transition",
                                                selectCard === (p.id) ? "border-blue-600 bg-blue-50/10" : "hover:bg-gray-50"
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="card_select"
                                                checked={selectCard === p.id}
                                                onChange={() => setSelectCard(p.id as string)}
                                            />
                                            <div className="text-sm">
                                                <div className="font-medium">
                                                    {(p.cardBrand || "CARD")} •••• {(p.last4 || "----")}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    有効期限: {String(p.expMonth || "").padStart(2, "0")}/{p.expYear || ""}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 border border-dashed rounded p-3 text-center">
                                    登録カードがありません
                                </div>
                            )}
                        </section>
                    )}

                    {/* 決済ボタン */}
                    <div className="pt-2">
                        {error && <p className="text-red-500 text-sm mb-2 text-center">{error}</p>}

                        <button
                            className={cn(
                                "w-full rounded-xl py-3 text-sm font-bold text-white transition",
                                busy
                                    ? "bg-gray-400 cursor-wait"
                                    : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"
                            )}
                            onClick={handlePay}
                            disabled={busy}
                        >
                            {busy ? "処理中..." : "支払いを確定する"}
                        </button>
                    </div>

                    {/* ★追加: キャンセルボタンエリア */}
                    <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                        <p className="text-xs text-center text-gray-400 mb-3">
                            この取引を中止する場合はこちら<br />
                            <span className="opacity-75">（中止すると申請承認前の状態には戻りません）</span>
                        </p>
                        <CancelTransactionButton
                            transactionId={tx.id}
                            onSuccess={onChanged}
                            className="w-full bg-white border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                        />
                    </div>

                </div>

                {/* カード追加モーダル */}
                {isPaymentModalOpen && (
                    <SquarePayment
                        setPayments={setPaymentList}
                        id={""}
                        isOpen={isPaymentModalOpen}
                        onClose={() => {
                            setReloadTrigger((prev) => prev + 1);
                            setIsPaymentModalOpen(false);
                        }}
                        openMode={"card"}
                    />
                )}
            </div>
        </>
    );
}