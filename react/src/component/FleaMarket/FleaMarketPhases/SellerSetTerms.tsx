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

import { s } from "../../../styles/component/fleaMarket/fleaMarketPhases/CompletePanel.styles";

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
     if (pr && (pr.status === "WITHDRAWN" || pr.status === "REJECTED")) {
    return <RequestCancelledPanel status={pr.status} reason={pr.rejection_reason || pr.withdrawal_reason} />;
  }
 
  if (!pr) return null;
 
  // BUYER View
  if (role === "BUYER") {
    return (
      <div style={s.wrap}>
        <ItemSummary item={item} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 0", textAlign: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, backgroundColor: "#f0eeeb", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Truck size={24} style={{ color: "#8c8c8c" }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, color: "#1a1a1a" }}>出品者の確認待ち</h3>
            <p style={{ fontSize: 14, color: "#8c8c8c", marginTop: 4 }}>
              出品者が配送方法や送料を確認しています。<br />
              条件が提示されるまでしばらくお待ちください。
            </p>
          </div>
        </div>
        <div style={{ borderTop: `1px solid #e0ddd8`, paddingTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8c8c8c", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Request</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#5c5a56" }}>配送希望</span>
              <span style={{ fontWeight: 500 }}>{SHIPPING_METHODS.find((m) => m.id === pr.shipping_method_pref)?.label}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#5c5a56" }}>送料負担</span>
              <span style={{ fontWeight: 500 }}>{SHIPPING_FEE_TYPES.find((f) => f.id === pr.shipping_fee_pref)?.label}</span>
            </div>
          </div>
          {pr && myUserId && (
            <div style={{ marginTop: 32 }}>
              <TransactionChat purchase_request_id={pr.id.toString()} myUserId={myUserId} />
            </div>
          )}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid #e0ddd8`, display: "flex", justifyContent: "center" }}>
            <WithdrawRequestButton requestId={pr.id} onWithdrawn={onChanged} />
          </div>
        </div>
      </div>
    );
  }
 
  // SELLER View
  return (
    <div style={{ ...s.wrap, overflow: "hidden" }}>
      {/* Header */}
      <div style={s.sectionTitle}>
        <h3 style={{ fontWeight: 700, fontSize: 18, color: "#1a1a1a" }}>取引条件の提示</h3>
        <p style={{ fontSize: 14, color: "#5c5a56", marginTop: 4 }}>購入者の希望を確認し、正式な送料・配送方法を決定してください。</p>
      </div>
 
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 32 }}>
        <ItemSummary item={item} />
 
        {/* 購入者の希望 */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: -12, left: 12, backgroundColor: "#fff", padding: "0 8px", fontSize: 11, fontWeight: 700, color: "#8c8c8c" }}>購入者の希望</div>
          <div style={s.addressBox}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#2e3128" }}>
              <Truck size={16} style={{ color: "#8c8c8c" }} />
              <span>配送: </span>
              <span style={{ fontWeight: 700 }}>{SHIPPING_METHODS.find((m) => m.id === pr.shipping_method_pref)?.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#2e3128", marginTop: 8 }}>
              <Box size={16} style={{ color: "#8c8c8c" }} />
              <span>送料: </span>
              <span style={{ fontWeight: 700 }}>{SHIPPING_FEE_TYPES.find((f) => f.id === pr.shipping_fee_pref)?.label}</span>
            </div>
            {pr.note && <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c", backgroundColor: "#f0eeeb", padding: 8, borderRadius: 6 }}>備考: {pr.note}</div>}
          </div>
        </div>
 
        {/* 設定フォーム */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* 配送方法 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>1. 配送方法 <span style={{ fontSize: 11, color: "#d63c20", fontWeight: 400 }}>必須</span></label>
            <div style={s.radioGrid}>
              <button type="button" onClick={() => setShippingMethod(ShippingMethod.DELIVERY)} style={s.radioBtn(shippingMethod === ShippingMethod.DELIVERY)}>
                <div style={s.radioBtnTitle}><Truck size={14} style={{ display: "inline", marginRight: 4 }} />配送</div>
              </button>
              <button type="button" onClick={() => setShippingMethod(ShippingMethod.MEETUP)} style={s.radioBtn(shippingMethod === ShippingMethod.MEETUP)}>
                <div style={s.radioBtnTitle}><MapPin size={14} style={{ display: "inline", marginRight: 4 }} />手渡し</div>
              </button>
            </div>
          </div>
 
          {isDelivery && (
            <>
              {/* 送料負担 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>2. 送料負担 <span style={{ fontSize: 11, color: "#d63c20", fontWeight: 400 }}>必須</span></label>
                <div style={s.radioGrid}>
                  <button type="button" onClick={() => setFeeType(ShippingFeePref.INCLUDED)} style={s.radioBtn(feeType === ShippingFeePref.INCLUDED)}>
                    <div style={s.radioBtnTitle}>送料込み</div>
                    <div style={s.radioBtnDesc}>出品者負担</div>
                  </button>
                  <button type="button" onClick={() => setFeeType(ShippingFeePref.COD)} style={s.radioBtn(feeType === ShippingFeePref.COD)}>
                    <div style={s.radioBtnTitle}>着払い</div>
                    <div style={s.radioBtnDesc}>購入者負担</div>
                  </button>
                </div>
              </div>
 
              {/* 送料入力 */}
              {isIncluded && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>3. 送料（円） <span style={{ fontSize: 11, color: "#d63c20", fontWeight: 400 }}>必須</span></label>
 
                  {/* 送料見積もりツール */}
                  <div style={{ ...s.addressBox, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#8c8c8c", display: "flex", alignItems: "center", gap: 4 }}><Calculator size={12} />送料見積もりツール（任意）</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 4 }}>配送業者</div>
                        <select style={s.select} value={carrier} onChange={(e) => setCarrier(e.target.value as Carrier)}>
                          {CARRIER_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 4 }}>温度帯</div>
                        <select style={s.select} value={temp} onChange={(e) => setTemp(e.target.value as Temp)}>
                          {TEMP_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 4 }}>サイズ</div>
                        <select style={s.select} value={size} onChange={(e) => setSize(Number(e.target.value) as Size)}>
                          {SIZE_OPTIONS.map((o) => <option key={o} value={o}>{o}サイズ</option>)}
                        </select>
                      </div>
                    </div>
                    {estimateLoading && <div style={{ fontSize: 12, color: "#8c8c8c" }}>計算中...</div>}
                    {estimateError && <div style={{ fontSize: 12, color: "#d63c20" }}>{estimateError}</div>}
                    {estimate !== null && !estimateLoading && (
                      <div style={s.estimateBox}>
                        <span style={s.estimateLabel}>見積もり送料</span>
                        <span style={s.estimateValue}>{yen(estimate)}</span>
                      </div>
                    )}
                  </div>
 
                  <input
                    type="number"
                    min={0}
                    placeholder="例: 800"
                    value={feeAmount === 0 ? "" : feeAmount}
                    onChange={(e) => setFeeAmount(Number(e.target.value))}
                    style={{ ...s.select, width: "100%" }}
                  />
                </div>
              )}
            </>
          )}
 
          {/* 購入者へのメモ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>購入者へのメモ（任意）</label>
            <textarea
              value={noteToBuyer}
              onChange={(e) => setNoteToBuyer(e.target.value)}
              placeholder="梱包方法、発送タイミングなど..."
              rows={3}
              style={{ ...s.select, resize: "vertical", fontFamily: "inherit", height: "auto" }}
            />
          </div>
 
          {/* 申請却下ボタン */}
          <div style={{ marginTop: 8 }}>
            <RejectRequestButton requestId={pr.id} onRejected={onChanged} />
          </div>
        </div>
 
        {/* 合計確認・確定ボタン */}
        <div style={{ borderTop: "2px dashed #e0ddd8", paddingTop: 24 }}>
          <div style={{ backgroundColor: "#1a1a1a", borderRadius: 16, padding: 24, color: "#fff", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#8c8c8c" }}>
              <span>商品価格</span><span>{yen(safeItemPrice)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#8c8c8c" }}>
              <span>送料</span>
              <span>{isDelivery ? (isIncluded ? yen(safeFeeAmount) : "着払い") : "なし"}</span>
            </div>
            <div style={{ height: 1, backgroundColor: "#5c5a56", margin: "4px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <span style={{ fontWeight: 700 }}>購入者に提示する合計</span>
              <span style={{ fontSize: 24, fontWeight: 700 }}>{yen(total)}</span>
            </div>
          </div>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmitTerms}
            style={{ ...s.acceptBtn, marginTop: 16, opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? "pointer" : "not-allowed" }}
          >
            条件を確定して取引を開始する <ArrowRight size={20} style={{ display: "inline" }} />
          </button>
        </div>
      </div>
    </div>
  );
 