import React from "react";
import { Truck, MapPin, ArrowRight, Box } from "lucide-react";

import {
  SHIPPING_METHODS,
  SHIPPING_FEE_TYPES,
  ShippingMethod,
  ShippingFeePref,
} from "../../../conf/FleaMarket";
import { FleaPurchaseRequestRow, FleaContent } from "../../../types/FleaMarket";
import api from "../../../conf/api";

import TransactionChat from "../../TransactionChat";
import WithdrawRequestButton from "../../WithdrawRequestButton";
import RejectRequestButton from "../../RejectRequestButton";
import { RequestCancelledPanel } from "./RequestCancelledPanel";

import { s } from "../../../styles/component/fleaMarket/fleaMarketPhases/SellerSetTerms.styles";

const yen = (n: number) => `¥${Math.floor(n).toLocaleString()}`;

function ItemSummary({ item }: { item: FleaContent | null }) {
  if (!item) return null;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, backgroundColor: "#f8f7f5", borderRadius: 12, border: "1px solid #e0ddd8" }}>
      {item.main_image_url && (
        <img src={item.main_image_url} alt={item.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
      )}
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
        <div style={{ fontSize: 14, color: "#1a5adc", fontWeight: 700 }}>¥{item.price.toLocaleString()}</div>
      </div>
    </div>
  );
}

export default function SellerSetTerms({
  pr,
  role,
  item,
  myUserId,
  onChanged,
}: {
  pr: FleaPurchaseRequestRow | null;
  role: "BUYER" | "SELLER";
  myUserId: string;
  item: FleaContent | null;
  onChanged: () => void;
}) {
  const [shippingMethod, setShippingMethod] = React.useState<ShippingMethod>(ShippingMethod.DELIVERY);
  const [feeType, setFeeType] = React.useState<ShippingFeePref>(ShippingFeePref.INCLUDED);
  const [feeAmount, setFeeAmount] = React.useState<number>(0);
  const [noteToBuyer, setNoteToBuyer] = React.useState("");

  const isDelivery = shippingMethod === ShippingMethod.DELIVERY;
  const isIncluded = feeType === ShippingFeePref.INCLUDED;
  const safeItemPrice = Number.isFinite(item?.price) ? (item?.price ?? 0) : 0;
  const safeFeeAmount = Number.isFinite(feeAmount) && feeAmount >= 0 ? feeAmount : 0;
  const total = safeItemPrice + (isDelivery && isIncluded ? safeFeeAmount : 0);
  const canSubmit = !!shippingMethod && (
    shippingMethod === ShippingMethod.MEETUP ||
    (!!feeType && (feeType === ShippingFeePref.COD || (isIncluded && safeFeeAmount >= 0)))
  );

  const handleSubmitTerms = async () => {
    if (!pr) return;
    try {
      await api.post(`/flea-market/purchase-requests/${pr.id}/set-terms`, {
        shipping_method: shippingMethod,
        shipping_fee_type: isDelivery && isIncluded ? ShippingFeePref.INCLUDED : feeType,
        shipping_fee_amount: isDelivery && isIncluded ? safeFeeAmount : 0,
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
    return <RequestCancelledPanel status={pr.status} reason={pr.rejection_reason || pr.withdrawal_reason} />;
  }
  if (!pr) return null;

  // ── BUYER View ──
  if (role === "BUYER") {
    return (
      <div style={s.wrap}>
        <ItemSummary item={item} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 0", textAlign: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, backgroundColor: "#f0eeeb", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Truck size={24} style={{ color: "#8c8c8c" }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>出品者の確認待ち</h3>
            <p style={{ fontSize: 14, color: "#5c5a56" }}>出品者が配送方法や送料を確認しています。<br />条件が提示されるまでしばらくお待ちください。</p>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #e0ddd8", paddingTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8c8c8c", marginBottom: 12 }}>YOUR REQUEST</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#5c5a56" }}>配送希望</span>
              <span style={{ fontWeight: 700 }}>{SHIPPING_METHODS.find((m) => m.id === pr.shipping_method_pref)?.label}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#5c5a56" }}>送料負担</span>
              <span style={{ fontWeight: 700 }}>{SHIPPING_FEE_TYPES.find((f) => f.id === pr.shipping_fee_pref)?.label}</span>
            </div>
          </div>
        </div>
        {pr && myUserId && (
          <div style={{ marginTop: 32 }}>
            <TransactionChat transactionId={pr.id.toString()} myUserId={myUserId} />
          </div>
        )}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #f0eeeb", display: "flex", justifyContent: "center" }}>
          <WithdrawRequestButton requestId={pr.id} onWithdrawn={onChanged} />
        </div>
      </div>
    );
  }

  // ── SELLER View ──
  return (
    <div style={{ ...s.wrap, overflow: "hidden" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <Truck size={16} style={{ color: "#8c8c8c" }} />
              <span>配送: </span>
              <span style={{ fontWeight: 700 }}>{SHIPPING_METHODS.find((m) => m.id === pr.shipping_method_pref)?.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginTop: 8 }}>
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
            <label style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>1. 配送方法 <span style={{ fontSize: 11, color: "#d63c20" }}>必須</span></label>
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
                <label style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>2. 送料負担</label>
                <div style={s.radioGrid}>
                  {[
                    { id: ShippingFeePref.INCLUDED, label: "送料込み（出品者負担）" },
                    { id: ShippingFeePref.COD, label: "着払い（購入者負担）" },
                  ].map(({ id, label }) => (
                    <button key={id} type="button" onClick={() => setFeeType(id)} style={s.radioBtn(feeType === id)}>
                      <div style={s.radioBtnTitle}>{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 送料金額 */}
              {isIncluded && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>3. 送料金額（円）</label>
                  <input
                    type="number"
                    min={0}
                    value={feeAmount}
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
            <textarea value={noteToBuyer} onChange={(e) => setNoteToBuyer(e.target.value)} placeholder="梱包方法、発送タイミングなど..." rows={3}
              style={{ ...s.select, resize: "vertical", fontFamily: "inherit", height: "auto" }} />
          </div>

          {/* 申請却下ボタン */}
          <div style={{ marginTop: 8 }}>
            <RejectRequestButton requestId={pr.id} onRejected={onChanged} />
          </div>
        </div>

        {/* チャット */}
        {pr && myUserId && (
          <div style={{ marginTop: 16 }}>
            <TransactionChat transactionId={pr.id.toString()} myUserId={myUserId} />
          </div>
        )}

        {/* 合計・確定ボタン */}
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
          <button type="button" disabled={!canSubmit} onClick={handleSubmitTerms}
            style={{ ...s.acceptBtn, marginTop: 16, opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? "pointer" : "not-allowed" }}>
            条件を確定して取引を開始する <ArrowRight size={20} style={{ display: "inline" }} />
          </button>
        </div>
      </div>
    </div>
  );
}