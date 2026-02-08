import React from "react";
import {
    SHIPPING_METHODS,
    SHIPPING_FEE_TYPES,
    ShippingFeePref,
    ShippingMethod,
} from "../../../conf/FleaMarket";
import api from "../../../conf/api";
import { CONFIG } from "../../../conf/config";

import { FleaPurchaseRequestRow } from "../../../types/FleaMarket";
import { Address } from "../../../types/Address";
import { FleaContent } from "../../../types/FleaMarket";
import { acceptPurchaseRequest } from "../../../function/FleaMarket";

import { WithdrawRequestButton } from "../../WithdrawRequestButton";
import { RejectRequestButton } from "../../RejectRequestButton";
import { RequestCancelledPanel} from "./RequestCancelledPanel"

// Icons
import {
    Calculator, Truck, Thermometer, Box, MapPin, Info, ArrowRight
} from "lucide-react";
import { TransactionChat } from "../../TransactionChat";

// ---------------------------------------------------------
// 定数・型定義
// ---------------------------------------------------------

const ESTIMATE_DEBOUNCE_MS = 500;

type Carrier = "YAMATO" | "JP";
type Temp = "AMBIENT" | "CHILLED" | "FROZEN";
type Size = 60 | 80 | 100 | 120 | 140 | 160;

const CARRIER_OPTIONS: Array<{ id: Carrier; label: string }> = [
    { id: "YAMATO", label: "ヤマト運輸" },
    { id: "JP", label: "日本郵便" },
];

const TEMP_OPTIONS: Array<{ id: Temp; label: string }> = [
    { id: "AMBIENT", label: "通常" },
    { id: "CHILLED", label: "冷蔵" },
    { id: "FROZEN", label: "冷凍" },
];

const SIZE_OPTIONS: Size[] = [60, 80, 100, 120, 140, 160];

// ---------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------

const cn = (...xs: Array<string | false | undefined | null>) => xs.filter(Boolean).join(" ");

function yen(n: number) {
    return `${Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)).toLocaleString()}円`;
}

// 送料見積もりAPI
async function fetchShippingEstimate(params: {
    carrier: Carrier;
    temp: Temp;
    size: number;
    sender_pref_code: number;
    receiver_pref_code: number;
}): Promise<number> {
    return api.post("/shipping/estimate", params).then((res) => res.data.price);
}

// ---------------------------------------------------------
// UI Components
// ---------------------------------------------------------

// 商品カード
function ItemSummary({ item }: { item: FleaContent | null }) {
    if (!item) return null;
    return (
        <div className="flex gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50/50">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 border border-gray-300">
                {item.main_image_url ? (
                    <img
                        src={CONFIG.BASE_URL + item.main_image_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        No Img
                    </div>
                )}
            </div>
            <div className="flex flex-col justify-center">
                <div className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</div>
                <div className="text-sm font-medium text-gray-600">{yen(item.price)}</div>
            </div>
        </div>
    );
}

// セグメントボタン（大）
const SegButton = ({
    active,
    children,
    onClick,
    icon: Icon,
}: {
    active: boolean;
    children: React.ReactNode;
    onClick: () => void;
    icon?: React.ElementType;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium border transition-all duration-200",
            active
                ? "border-black bg-black text-white shadow-md"
                : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900"
        )}
    >
        {Icon && <Icon size={16} />}
        {children}
    </button>
);

// ピルボタン（小）
const Pill = ({
    active,
    children,
    onClick,
}: {
    active: boolean;
    children: React.ReactNode;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
            active
                ? "border-black bg-gray-900 text-white shadow-sm"
                : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
        )}
    >
        {children}
    </button>
);

// ---------------------------------------------------------
// Main Component
// ---------------------------------------------------------

export default function SellerSetTerms({
    pr,
    role,
    item,
    buyer_address,
    myUserId,
    onChanged,
}: {
    pr: FleaPurchaseRequestRow | null;
    role: "BUYER" | "SELLER";
    myUserId: string; // 自分のID (チャット用)
    item: FleaContent | null;
    buyer_address: Address | null;
    onChanged: () => void;
}) {
    // --- State ---
    const [shippingMethod, setShippingMethod] = React.useState<ShippingMethod>(ShippingMethod.DELIVERY);
    const [feeType, setFeeType] = React.useState<ShippingFeePref>(ShippingFeePref.INCLUDED);
    const [feeAmount, setFeeAmount] = React.useState<number>(0);
    const [noteToBuyer, setNoteToBuyer] = React.useState("");

    // Estimate State
    const [carrier, setCarrier] = React.useState<Carrier>("YAMATO");
    const [temp, setTemp] = React.useState<Temp>("AMBIENT");
    const [size, setSize] = React.useState<Size>(100);

    const [estimate, setEstimate] = React.useState<number | null>(null);
    const [estimateLoading, setEstimateLoading] = React.useState(false);
    const [estimateError, setEstimateError] = React.useState<string | null>(null);

    // --- Computed ---
    const isDelivery = shippingMethod === ShippingMethod.DELIVERY;
    const isIncluded = feeType === ShippingFeePref.INCLUDED;

    const safeItemPrice = Number.isFinite(item?.price) ? (item?.price ?? 0) : 0;
    const safeFeeAmount = Number.isFinite(feeAmount) && feeAmount >= 0 ? feeAmount : 0;
    const total = safeItemPrice + (isDelivery && isIncluded ? safeFeeAmount : 0);

    const canSubmit =
        !!shippingMethod &&
        (shippingMethod === ShippingMethod.MEETUP ||
            (!!feeType && (feeType === ShippingFeePref.COD || (isIncluded && safeFeeAmount >= 0))));

    const reqSeq = React.useRef(0);

    console.log(pr)
    // --- Effects ---
    React.useEffect(() => {
        if (!pr) return;
        setShippingMethod(pr.shipping_method_pref === "MEETUP" ? ShippingMethod.MEETUP : ShippingMethod.DELIVERY);
        setFeeType(pr.shipping_fee_pref === "COD" ? ShippingFeePref.COD : ShippingFeePref.INCLUDED);
        setFeeAmount(0);
        setNoteToBuyer("");
        setEstimate(null);
        setCarrier("YAMATO");
        setTemp("AMBIENT");
        setSize(100);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pr?.id]);

    React.useEffect(() => {
        if (!(isDelivery && isIncluded)) {
            setEstimate(null);
            setEstimateLoading(false);
            return;
        }
        setEstimate(null);
        if (!item || !buyer_address) return;

        const timer = setTimeout(estimateShipping, ESTIMATE_DEBOUNCE_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [carrier, temp, size, isDelivery, isIncluded, item, buyer_address]);

    React.useEffect(() => {
        setEstimate(null);
    }, [carrier, temp, size]);

    // --- Handlers ---
    const estimateShipping = async (): Promise<void> => {
        const mySeq = ++reqSeq.current;
        if (!item?.shipFrom || !buyer_address?.pref_code) return;

        try {
            setEstimateLoading(true);
            setEstimateError(null);
            const price = await fetchShippingEstimate({
                carrier, temp, size,
                sender_pref_code: item.shipFrom,
                receiver_pref_code: buyer_address.pref_code,
            });
            if (mySeq !== reqSeq.current) return;
            setEstimate(price);
        } catch {
            if (mySeq !== reqSeq.current) return;
            setEstimateError("取得失敗");
        } finally {
            if (mySeq === reqSeq.current) {
                setEstimateLoading(false);
            }
        }
    };

    const applyEstimateToFee = () => {
        if (estimate != null) setFeeAmount(Math.max(0, Math.floor(estimate)));
    };

    const handleSubmitTerms = async () => {
        if (!pr) return;
        if (!confirm("この条件で取引を開始しますか？")) return;
        try {
            await acceptPurchaseRequest(pr.id, {
                shipping_method: shippingMethod,
                shipping_fee_type: shippingMethod === ShippingMethod.MEETUP ? ShippingFeePref.INCLUDED : feeType,
                shipping_fee_amount: (isDelivery && isIncluded) ? safeFeeAmount : 0,
                note_to_buyer: noteToBuyer.trim(),
            });
            alert("取引条件を確定しました。");
            onChanged();
        } catch (e) {
            alert("エラーが発生しました");
            console.error(e);
        }
    };

    if (pr && (pr.status === "WITHDRAWN" || pr.status === "REJECTED")) {
        return <RequestCancelledPanel pr={pr} role={role} />;
    }

    if (!pr) return null;

    // ----------------------------------------------------
    // BUYER View
    // ----------------------------------------------------
    if (role === "BUYER") {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-6">
                <ItemSummary item={item} />

                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center animate-pulse">
                        <Truck className="text-gray-500" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">出品者の確認待ち</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            出品者が配送方法や送料を確認しています。<br />
                            条件が提示されるまでしばらくお待ちください。
                        </p>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <div className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Your Request</div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">配送希望</span>
                            <span className="font-medium text-gray-900">
                                {SHIPPING_METHODS.find((m) => m.id === pr.shipping_method_pref)?.label}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">送料負担</span>
                            <span className="font-medium text-gray-900">
                                {SHIPPING_FEE_TYPES.find((f) => f.id === pr.shipping_fee_pref)?.label}
                            </span>
                        </div>
                        {/* チャットエリアを追加 */}
                        {pr && myUserId && (
                            <div className="mt-8">
                                <TransactionChat
                                    purchase_request_id={pr.id.toString()}
                                    myUserId={myUserId}
                                />
                            </div>
                        )}
                        {/* 申請取り下げボタン */}
                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                            <WithdrawRequestButton
                                requestId={pr.id}
                                onSuccess={onChanged}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ----------------------------------------------------
    // SELLER View
    // ----------------------------------------------------
    return (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 p-5 border-b border-gray-200">
                <h3 className="font-bold text-lg text-black">取引条件の提示</h3>
                <p className="text-sm text-gray-600 mt-1">
                    購入者の希望を確認し、正式な送料・配送方法を決定してください。
                </p>
            </div>

            <div className="p-5 space-y-8">
                <ItemSummary item={item} />

                {/* 購入者の希望 */}
                <div className="relative">
                    <div className="absolute -top-3 left-3 bg-white px-2 text-xs font-bold text-gray-400">
                        購入者の希望
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 pt-5 grid grid-cols-1 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                            <Truck size={16} className="text-gray-400" />
                            <span>配送: </span>
                            <span className="font-bold text-black">
                                {SHIPPING_METHODS.find((m) => m.id === pr.shipping_method_pref)?.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <Box size={16} className="text-gray-400" />
                            <span>送料: </span>
                            <span className="font-bold text-black">
                                {SHIPPING_FEE_TYPES.find((f) => f.id === pr.shipping_fee_pref)?.label}
                            </span>
                        </div>
                        {pr.note && (
                            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                備考: {pr.note}
                            </div>
                        )}
                    </div>
                </div>

                {/* 設定フォーム */}
                <div className="space-y-6">
                    {/* 配送方法 */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-black flex items-center gap-2">
                            1. 配送方法 <span className="text-red-500 text-xs font-normal">必須</span>
                        </label>
                        <div className="flex gap-3">
                            <SegButton
                                active={shippingMethod === ShippingMethod.DELIVERY}
                                onClick={() => setShippingMethod(ShippingMethod.DELIVERY)}
                                icon={Truck}
                            >
                                配送
                            </SegButton>
                            <SegButton
                                active={shippingMethod === ShippingMethod.MEETUP}
                                onClick={() => setShippingMethod(ShippingMethod.MEETUP)}
                                icon={MapPin}
                            >
                                手渡し
                            </SegButton>
                        </div>
                    </div>

                    {isDelivery && (
                        <>
                            {/* 送料負担 */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-black flex items-center gap-2">
                                    2. 送料負担 <span className="text-red-500 text-xs font-normal">必須</span>
                                </label>
                                <div className="flex gap-3">
                                    <SegButton
                                        active={feeType === ShippingFeePref.INCLUDED}
                                        onClick={() => setFeeType(ShippingFeePref.INCLUDED)}
                                    >
                                        送料込み (出品者負担)
                                    </SegButton>
                                    <SegButton
                                        active={feeType === ShippingFeePref.COD}
                                        onClick={() => setFeeType(ShippingFeePref.COD)}
                                    >
                                        着払い (購入者負担)
                                    </SegButton>
                                </div>
                            </div>

                            {/* 送料計算 & 入力 */}
                            {isIncluded && (
                                <div className="space-y-4">
                                    {/* 計算機カード */}
                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                        <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700">
                                            <Calculator size={16} /> 送料計算ツール
                                        </div>

                                        <div className="space-y-3">
                                            {/* 条件選択 */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Truck size={12} /> 業者
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {CARRIER_OPTIONS.map((o) => (
                                                        <Pill key={o.id} active={carrier === o.id} onClick={() => setCarrier(o.id)}>
                                                            {o.label}
                                                        </Pill>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <Thermometer size={12} /> 温度帯
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {TEMP_OPTIONS.filter(o => !(carrier === "JP" && o.id === "FROZEN")).map((o) => (
                                                            <Pill key={o.id} active={temp === o.id} onClick={() => setTemp(o.id)}>
                                                                {o.label}
                                                            </Pill>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <Box size={12} /> サイズ
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {SIZE_OPTIONS.filter(s => carrier === "YAMATO" && ["CHILLED", "FROZEN"].includes(temp) ? s <= 120 : true).map((s) => (
                                                            <Pill key={s} active={size === s} onClick={() => setSize(s)}>
                                                                {s}
                                                            </Pill>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 計算結果表示エリア */}
                                            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
                                                <div className="text-xs text-gray-500">
                                                    参考送料:
                                                    {estimateLoading ? (
                                                        <span className="ml-2">計算中...</span>
                                                    ) : estimateError ? (
                                                        <span className="ml-2 text-red-500">取得失敗</span>
                                                    ) : estimate !== null ? (
                                                        <span className="ml-2 font-bold text-gray-900 text-lg">{yen(estimate)}</span>
                                                    ) : (
                                                        <span className="ml-2">-</span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={estimate === null}
                                                    onClick={applyEstimateToFee}
                                                    className="text-xs bg-black text-white px-3 py-1.5 rounded-lg disabled:opacity-50 hover:bg-gray-800 transition"
                                                >
                                                    入力欄に反映
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 金額入力メイン */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-black">
                                            3. 最終的な送料 <span className="text-red-500 text-xs font-normal">※購入者に請求する額</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min={0}
                                                className="w-full text-right pr-12 pl-4 py-3 text-xl font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                                                value={Number.isFinite(feeAmount) ? feeAmount : 0}
                                                onChange={(e) => setFeeAmount(Number(e.target.value))}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                                                円
                                            </span>
                                        </div>

                                        {/* クイックボタン */}
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            {[500, 800, 1000, 1200, 1500].map(v => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    onClick={() => setFeeAmount(v)}
                                                    className="text-xs border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50 text-gray-600"
                                                >
                                                    {yen(v)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {!isDelivery && (
                        <div className="bg-gray-50 p-4 rounded-xl text-sm flex gap-2 text-gray-600">
                            <Info size={18} className="shrink-0 mt-0.5" />
                            手渡しのため、システム上の送料は 0円 で設定されます。
                        </div>
                    )}

                    {/* チャットエリアを追加 */}
                    {pr && myUserId && (
                        <div className="mt-8">
                            <TransactionChat
                                purchase_request_id={pr.id.toString()}
                                myUserId={myUserId}
                            />
                        </div>
                    )}
                    {/* 申請却下ボタン */}
                    <div className="mt-4">
                        <RejectRequestButton
                            requestId={pr.id}
                            onSuccess={onChanged}
                            className="w-full bg-white border-none text-red-500 hover:bg-red-50 hover:text-red-600"
                        />
                    </div>
                </div>

                {/* 合計確認エリア */}
                <div className="border-t-2 border-dashed border-gray-200 pt-6">
                    <div className="bg-gray-900 rounded-2xl p-6 text-white space-y-4 shadow-lg">
                        <div className="flex justify-between items-center text-sm text-gray-400">
                            <span>商品価格</span>
                            <span>{yen(safeItemPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-400">
                            <span>送料</span>
                            <span>
                                {isDelivery
                                    ? (isIncluded ? yen(safeFeeAmount) : "着払い")
                                    : "なし"
                                }
                            </span>
                        </div>
                        <div className="h-px bg-gray-700 my-2" />
                        <div className="flex justify-between items-end">
                            <span className="font-bold">購入者に提示する合計</span>
                            <span className="text-2xl font-bold tracking-tight">{yen(total)}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={!canSubmit}
                        onClick={handleSubmitTerms}
                        className={cn(
                            "mt-4 w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all",
                            canSubmit
                                ? "bg-black text-white hover:bg-gray-800 shadow-md hover:scale-[1.01]"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                    >
                        条件を確定して取引を開始する
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}