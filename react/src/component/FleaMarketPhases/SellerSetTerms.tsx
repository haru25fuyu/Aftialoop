import React from "react";

import {
    SHIPPING_METHODS,
    SHIPPING_FEE_TYPES,
    ShippingFeePref,
    ShippingMethod,
} from "../../conf/FleaMarket";
import api from "../../conf/api";
import { CONFIG } from "../../conf/config";

import { FleaPurchaseRequestRow } from "../../types/FleaMarket";
import { Address } from "../../types/Address";
import { FleaContent } from "../../types/FleaMarket";



// ---------------------------------------------------------
// 定数・型定義
// ---------------------------------------------------------

const ESTIMATE_DEBOUNCE_MS = 500;

type Carrier = "YAMATO" | "JP";
type Temp = "AMBIENT" | "CHILLED" | "FROZEN";
type Size = 60 | 80 | 100 | 120 | 140 | 160; // 140以上も念のため定義に含める

const CARRIER_OPTIONS: Array<{ id: Carrier; label: string }> = [
    { id: "YAMATO", label: "ヤマト" },
    { id: "JP", label: "日本郵便" },
];

const TEMP_OPTIONS: Array<{ id: Temp; label: string }> = [
    { id: "AMBIENT", label: "通常" },
    { id: "CHILLED", label: "冷蔵" },
    { id: "FROZEN", label: "冷凍" },
];

// 基本サイズ選択肢
const SIZE_OPTIONS: Size[] = [60, 80, 100, 120, 140, 160];

// ---------------------------------------------------------
// ヘルパー関数
// ---------------------------------------------------------

const cn = (...xs: Array<string | false | undefined | null>) => xs.filter(Boolean).join(" ");

function yen(n: number) {
    return `${Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)).toLocaleString()}円`;
}

// 送料見積もりAPI呼び出し
async function fetchShippingEstimate(params: {
    carrier: Carrier;
    temp: Temp;
    size: number;
    sender_pref_code: number;
    receiver_pref_code: number;
}): Promise<number> {
    return api
        .post("/shipping/estimate", params)
        .then((res) => {
            console.log("Estimate result:", res.data);
            return res.data.price;
        })
        .catch((error) => {
            console.error("Error fetching shipping estimate:", error);
            throw error;
        });
}

// ---------------------------------------------------------
// サブコンポーネント
// ---------------------------------------------------------

// 商品情報のサマリー表示
function ItemSummary({ item }: { item: FleaContent | null }) {
    if (!item) return null;
    return (
        <div className="flex gap-4 border-b border-gray-100 pb-4 mb-4">
            {/* 画像表示 */}
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 border border-gray-200">
                {item.main_image_url ? (
                    <img
                        src={CONFIG.BASE_URL + item.main_image_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        No Image
                    </div>
                )}
            </div>
            {/* テキスト情報 */}
            <div className="flex flex-col justify-center">
                <div className="text-sm font-bold text-gray-900 line-clamp-2">{item.name}</div>
                <div className="text-sm text-gray-600">{yen(item.price)}</div>
            </div>
        </div>
    );
}

// 選択ボタン（大）
const SegButton = ({
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
            "flex-1 rounded-xl px-3 py-2 text-sm border transition",
            active
                ? "border-black bg-black text-white"
                : "border-gray-200 bg-white hover:bg-gray-50 text-gray-900"
        )}
    >
        {children}
    </button>
);

// 選択ボタン（小・ピル型）
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
            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
            active
                ? "border-black bg-gray-900 text-white"
                : "border-gray-200 hover:bg-gray-50 text-gray-700"
        )}
    >
        {children}
    </button>
);

// ---------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------

export default function SellerSetTerms({
    pr,
    role,
    item,
    buyer_address,
    onSubmitTerms,
}: {
    pr: FleaPurchaseRequestRow | null;
    role: "BUYER" | "SELLER";
    item: FleaContent | null; // null許容
    buyer_address: Address | null; // null許容
    onSubmitTerms: (p: {
        shipping_method: ShippingMethod;
        shipping_fee_type: ShippingFeePref;
        shipping_fee_amount?: number;
        note_to_buyer?: string;
    }) => Promise<void>;
}) {
    // --- State ---
    const [shippingMethod, setShippingMethod] = React.useState<ShippingMethod>(ShippingMethod.DELIVERY);
    const [feeType, setFeeType] = React.useState<ShippingFeePref>(ShippingFeePref.INCLUDED);
    const [feeAmount, setFeeAmount] = React.useState<number>(0);
    const [noteToBuyer, setNoteToBuyer] = React.useState("");

    // 見積もり用State
    const [carrier, setCarrier] = React.useState<Carrier>("YAMATO");
    const [temp, setTemp] = React.useState<Temp>("AMBIENT");
    const [size, setSize] = React.useState<Size>(100);

    const [estimate, setEstimate] = React.useState<number | null>(null);
    const [estimateLoading, setEstimateLoading] = React.useState(false);
    const [estimateError, setEstimateError] = React.useState<string | null>(null);

    // --- Computed ---
    const isDelivery = shippingMethod === ShippingMethod.DELIVERY;
    const isIncluded = feeType === ShippingFeePref.INCLUDED;

    // 安全な数値計算（itemがnull等の場合に対処）
    const safeItemPrice = Number.isFinite(item?.price) ? (item?.price ?? 0) : 0;
    const safeFeeAmount = Number.isFinite(feeAmount) && feeAmount >= 0 ? feeAmount : 0;
    const total = safeItemPrice + (isDelivery && isIncluded ? safeFeeAmount : 0);

    const canSubmit =
        !!shippingMethod &&
        (shippingMethod === ShippingMethod.MEETUP ||
            (!!feeType && (feeType === ShippingFeePref.COD || (isIncluded && safeFeeAmount >= 0))));

    const reqSeq = React.useRef(0);

    // --- Effects ---

    // 初期化
    React.useEffect(() => {
        if (!pr) return;

        setShippingMethod(pr.shipping_method_pref === "MEETUP" ? ShippingMethod.MEETUP : ShippingMethod.DELIVERY);
        setFeeType(pr.shipping_fee_pref === "COD" ? ShippingFeePref.COD : ShippingFeePref.INCLUDED);

        console.log("初期状態:", { pr, role, item, buyer_address });

        setFeeAmount(0);
        setNoteToBuyer("");

        setEstimate(null);
        setEstimateError(null);
        setEstimateLoading(false);

        setCarrier("YAMATO");
        setTemp("AMBIENT");
        setSize(100);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pr?.id]);

    // 見積もりの自動再計算（デバウンス付き）
    React.useEffect(() => {
        if (!(isDelivery && isIncluded)) {
            setEstimate(null);
            setEstimateError(null);
            setEstimateLoading(false);
            return;
        }

        setEstimate(null);
        setEstimateError(null);

        // item や buyer_address がない場合はAPIを叩かない
        if (!item || !buyer_address) {
            return;
        }

        const timer = setTimeout(() => {
            estimateShipping();
        }, ESTIMATE_DEBOUNCE_MS);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [carrier, temp, size, isDelivery, isIncluded, item, buyer_address]);

    // 条件変更時に古い見積もりをクリア
    React.useEffect(() => {
        setEstimate(null);
        setEstimateError(null);
    }, [carrier, temp, size]);

    // --- Handlers ---

    const estimateShipping = async () => {
        const mySeq = ++reqSeq.current;

        // ガード節: 必要なデータが揃っているか確認
        if (!item?.shipFrom || !buyer_address?.pref_code) {
            console.warn("送料見積もりに必要な情報が不足しています");
            return;
        }

        try {
            setEstimateLoading(true);
            setEstimateError(null);

            const price = await fetchShippingEstimate({
                carrier: carrier,
                temp: temp,
                size: size,
                sender_pref_code: item.shipFrom,
                receiver_pref_code: buyer_address.pref_code,
            });

            // 最新のリクエストでなければ無視
            if (mySeq !== reqSeq.current) return;

            setEstimate(price);
        } catch {
            if (mySeq !== reqSeq.current) return;
            setEstimate(null);
            setEstimateError("参考送料の取得に失敗しました");
        } finally {
            if (mySeq !== reqSeq.current) return;
            setEstimateLoading(false);
        }
    };

    function applyEstimateToFee() {
        if (estimate == null) return;
        setFeeAmount(Math.max(0, Math.floor(estimate)));
    }

    // --- Rendering ---

    if (!pr) return <div className="text-sm text-gray-500">申請情報がありません</div>;

    // ----------------------------------------------------
    // 購入者（BUYER）向け表示
    // ----------------------------------------------------
    if (role === "BUYER") {
        return (
            <div className="rounded-2xl border bg-white p-5 space-y-4">
                {/* 商品情報 */}
                <ItemSummary item={item} />

                <div className="rounded-xl bg-blue-50 p-4">
                    <div className="flex items-center gap-2 text-blue-800">
                        <span className="text-lg">⏳</span>
                        <div className="font-bold">出品者の確認待ち</div>
                    </div>
                    <div className="mt-1 text-sm text-blue-700">
                        出品者が配送方法や送料を確認しています。条件が提示されるまでお待ちください。
                    </div>
                </div>

                <div className="text-sm text-gray-600">
                    <div className="font-bold mb-2 text-gray-900">あなたの希望条件</div>
                    <div className="space-y-1 pl-1">
                        <div>
                            配送希望: {SHIPPING_METHODS.find((m) => m.id === pr.shipping_method_pref)?.label}
                        </div>
                        <div>
                            送料希望: {SHIPPING_FEE_TYPES.find((f) => f.id === pr.shipping_fee_pref)?.label}
                        </div>
                        {pr.note && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-gray-600">備考: {pr.note}</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ----------------------------------------------------
    // 出品者（SELLER）向け表示
    // ----------------------------------------------------
    return (
        <div className="rounded-2xl border bg-white p-5 space-y-5">
            {/* 商品情報 */}
            <ItemSummary item={item} />

            <div>
                <div className="text-lg font-semibold">取引条件の提示</div>
                <div className="mt-1 text-sm text-gray-600">
                    購入者の希望を確認し、正式な送料・配送方法を決定してください。
                </div>
            </div>

            {/* 申請内容 */}
            <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                <div className="font-medium text-gray-900">購入者の希望</div>
                <div className="mt-2 grid grid-cols-1 gap-1 text-gray-700">
                    <div>
                        配送: {SHIPPING_METHODS.find((m) => m.id === pr.shipping_method_pref)?.label}
                    </div>
                    <div>
                        送料: {SHIPPING_FEE_TYPES.find((f) => f.id === pr.shipping_fee_pref)?.label}
                    </div>
                    {pr.note && <div className="text-gray-600">備考: {pr.note}</div>}
                </div>
            </div>

            {/* 配送方法の選択 */}
            <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">配送方法（確定）</div>
                <div className="flex gap-2">
                    <SegButton
                        active={shippingMethod === ShippingMethod.DELIVERY}
                        onClick={() => setShippingMethod(ShippingMethod.DELIVERY)}
                    >
                        配送
                    </SegButton>
                    <SegButton
                        active={shippingMethod === ShippingMethod.MEETUP}
                        onClick={() => setShippingMethod(ShippingMethod.MEETUP)}
                    >
                        手渡し
                    </SegButton>
                </div>
            </div>

            {isDelivery && (
                <div className="space-y-4">
                    {/* 送料負担区分 */}
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-900">送料（確定）</div>
                        <div className="flex gap-2">
                            <SegButton
                                active={feeType === ShippingFeePref.INCLUDED}
                                onClick={() => setFeeType(ShippingFeePref.INCLUDED)}
                            >
                                送料込み
                            </SegButton>
                            <SegButton
                                active={feeType === ShippingFeePref.COD}
                                onClick={() => setFeeType(ShippingFeePref.COD)}
                            >
                                着払い
                            </SegButton>
                        </div>
                    </div>

                    {isIncluded && (
                        <div className="space-y-3">
                            {/* --- 参考送料カード --- */}
                            <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">参考送料</div>
                                        <div className="mt-1 text-xs text-gray-600">
                                            目安です。正確にしたい人だけ計測して調整でOK。
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={estimateShipping}
                                        disabled={estimateLoading || !(isDelivery && isIncluded)}
                                        className="rounded-lg border px-3 py-1 text-xs hover:bg-gray-50 transition"
                                    >
                                        {estimateLoading ? "計算中…" : "再取得"}
                                    </button>
                                </div>

                                {/* 条件ピル */}
                                <div className="mt-3 space-y-3">
                                    {/* キャリア選択 */}
                                    <div className="flex flex-wrap gap-2">
                                        {CARRIER_OPTIONS.map((o) => (
                                            <Pill
                                                key={o.id}
                                                active={carrier === o.id}
                                                onClick={() => {
                                                    setCarrier(o.id);
                                                    // JPに切り替えた時、もし「冷凍」が選ばれていたら「通常」に戻す
                                                    if (o.id === "JP" && temp === "FROZEN") {
                                                        setTemp("AMBIENT");
                                                    }
                                                }}
                                            >
                                                {o.label}
                                            </Pill>
                                        ))}
                                    </div>

                                    {/* 温度帯選択 */}
                                    <div className="flex flex-wrap gap-2">
                                        {TEMP_OPTIONS
                                            // JPの場合は冷凍(FROZEN)を表示しない
                                            .filter((o) => !(carrier === "JP" && o.id === "FROZEN"))
                                            .map((o) => (
                                                <Pill key={o.id} active={temp === o.id} onClick={() => setTemp(o.id)}>
                                                    {o.label}
                                                </Pill>
                                            ))}
                                    </div>

                                    {/* サイズ選択 */}
                                    <div className="flex flex-wrap gap-2">
                                        {SIZE_OPTIONS
                                            // ヤマトかつクール便(冷蔵・冷凍)の場合、120サイズを超える選択肢を表示しない
                                            .filter((s) => {
                                                if (
                                                    carrier === "YAMATO" &&
                                                    (temp === "CHILLED" || temp === "FROZEN")
                                                ) {
                                                    return s <= 120;
                                                }
                                                return true;
                                            })
                                            .map((s) => (
                                                <Pill key={s} active={size === s} onClick={() => setSize(s)}>
                                                    {s}サイズ
                                                </Pill>
                                            ))}
                                    </div>
                                </div>

                                {estimateError && (
                                    <div className="mt-3 text-xs text-red-600">{estimateError}</div>
                                )}

                                {estimate != null && (
                                    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3">
                                        <div>
                                            <div className="text-xs text-gray-500">見積もり</div>
                                            <div className="text-xl font-semibold text-gray-900">{yen(estimate)}</div>
                                        </div>
                                        <button
                                            type="button"
                                            className="rounded-xl bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-900 transition"
                                            onClick={applyEstimateToFee}
                                        >
                                            送料に反映
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* --- 送料入力欄 --- */}
                            <div className="rounded-2xl border border-gray-200 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">送料（入力）</div>
                                        <div className="mt-1 text-xs text-gray-600">
                                            最終的に購入者へ提示する送料です。
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center gap-2">
                                    <input
                                        className="w-40 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                                        type="number"
                                        min={0}
                                        inputMode="numeric"
                                        value={Number.isFinite(feeAmount) ? feeAmount : 0}
                                        onChange={(e) => {
                                            const v = Number(e.target.value);
                                            setFeeAmount(Number.isFinite(v) ? v : 0);
                                        }}
                                    />
                                    <span className="text-sm text-gray-600">円</span>
                                </div>

                                {/* 便利チップ */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {[500, 800, 1000, 1200].map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition"
                                            onClick={() => setFeeAmount(v)}
                                        >
                                            {yen(v)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 合計金額表示 */}
                    <div className="rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">商品</span>
                            <span className="font-medium text-gray-900">{yen(safeItemPrice)}</span>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-gray-600">送料</span>
                            <span className="font-medium text-gray-900">
                                {feeType === ShippingFeePref.INCLUDED ? yen(safeFeeAmount) : "着払い"}
                            </span>
                        </div>

                        <div className="mt-3 border-t pt-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-900">購入者に提示する合計</span>
                            <span className="text-lg font-semibold text-gray-900">{yen(total)}</span>
                        </div>
                    </div>
                </div>
            )}

            {!isDelivery && (
                <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">購入者に提示する合計</span>
                        <span className="text-lg font-semibold text-gray-900">{yen(safeItemPrice)}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        ※ 手渡しの場合、送料は発生しません。受け渡し条件はメッセージで。
                    </div>
                </div>
            )}

            {/* メッセージ入力 */}
            <div>
                <div className="text-sm font-medium text-gray-900">購入者へのメッセージ（任意）</div>
                <textarea
                    className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    rows={3}
                    value={noteToBuyer}
                    onChange={(e) => setNoteToBuyer(e.target.value)}
                    maxLength={500}
                />
                <div className="mt-1 text-xs text-gray-500">{noteToBuyer.length}/500</div>
            </div>

            {/* 決定ボタン */}
            <button
                type="button"
                className={cn(
                    "w-full rounded-2xl py-3 text-sm font-semibold text-white transition",
                    canSubmit ? "bg-black hover:bg-gray-900" : "bg-gray-300 cursor-not-allowed"
                )}
                disabled={!canSubmit}
                onClick={() =>
                    onSubmitTerms({
                        shipping_method: shippingMethod,
                        shipping_fee_type:
                            shippingMethod === ShippingMethod.MEETUP ? ShippingFeePref.INCLUDED : feeType,
                        shipping_fee_amount:
                            shippingMethod === ShippingMethod.DELIVERY && feeType === ShippingFeePref.INCLUDED
                                ? safeFeeAmount
                                : 0,
                        note_to_buyer: noteToBuyer.trim(),
                    })
                }
            >
                条件を提示する
            </button>
        </div>
    );
}