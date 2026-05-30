import React, { useEffect, useState } from "react";
import { Address } from "../types/Address";
import SelectAddressModal from "./SelectAddressModal";
import { fetchAddress } from "../conf/function";
import { ShippingMethod, ShippingFeePref } from "../conf/FleaMarket";
import LoginModal from "./Login";
import { LoadingButton } from "../component/LoadingButton";
import { s } from "../styles/modal/PurchaseRequestModal.styles";

export type PurchaseRequestPayload = { item_id: string | number; address_id: string | number; shipping_method_pref: ShippingMethod; shipping_fee_pref: ShippingFeePref; note?: string; };

type Props = { isOpen?: boolean; open?: boolean; itemId?: string | number; item?: any; onClose: () => void; onSubmit: (payload: PurchaseRequestPayload) => Promise<void> | void; submitting?: boolean; };

export default function PurchaseRequestModal({ isOpen, open, itemId, item, onClose, onSubmit, submitting }: Props) {
  const isVisible = isOpen ?? open ?? false;
  const targetItemId = itemId ?? item?.id;

  const [shippingMethodPref, setShippingMethodPref] = useState<ShippingMethod>(ShippingMethod.SELLER_CHOICE);
  const [shippingFeePref, setShippingFeePref] = useState<ShippingFeePref>(ShippingFeePref.OK_EITHER);
  const [note, setNote] = useState("");
  const [address, setAddress] = useState<Address | null>(null);
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const busy = Boolean(submitting ?? localSubmitting);

  useEffect(() => {
    if (!isVisible) return;
    fetchAddress().then((list) => { const def = list.find((a: Address) => a.status === 1) || list[0]; if (def) setAddress(def); }).catch(() => setIsLoginOpen(true));
  }, [isVisible]);

  if (!isVisible) return null;

  const handleSubmit = async () => {
    if (!address) { alert("住所を選択してください"); return; }
    setLocalSubmitting(true);
    try { await onSubmit({ item_id: targetItemId!, address_id: address.id, shipping_method_pref: shippingMethodPref, shipping_fee_pref: shippingFeePref, note: note || undefined }); onClose(); }
    catch { alert("リクエストに失敗しました"); }
    finally { setLocalSubmitting(false); }
  };

  const SHIP_METHODS = [
    { value: ShippingMethod.SELLER_CHOICE, label: "出品者に任せる" },
    { value: ShippingMethod.PREFER_TRACKED, label: "追跡あり希望" },
    { value: ShippingMethod.PREFER_COMPACT, label: "コンパクト便希望" },
  ];
  const FEE_PREFS = [
    { value: ShippingFeePref.OK_EITHER, label: "どちらでも" },
    { value: ShippingFeePref.PREFER_SELLER_BEARS, label: "出品者負担希望" },
    { value: ShippingFeePref.PREFER_BUYER_BEARS, label: "自分で負担OK" },
  ];

  return (
    <>
      <div style={s.overlay}>
        <div style={s.card}>
          <div style={s.header}>
            <h2 style={s.title}>購入リクエスト</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#8c8c8c" }}>×</button>
          </div>
          <div style={s.body}>
            {/* 住所 */}
            <div style={s.section}>
              <div style={s.sectionHeader}>
                <span style={s.sectionTitle}>お届け先</span>
                <button onClick={() => setIsAddressOpen(true)} style={s.changeBtn}>変更</button>
              </div>
              {address ? (
                <div style={{ fontSize: 14, color: "#2e3128", lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 700 }}>{address.name}</div>
                  <div>〒{address.post_code} {address.pref}{address.address1}{address.address2}</div>
                  <div>{address.phone}</div>
                </div>
              ) : (
                <button onClick={() => setIsAddressOpen(true)} style={s.addAddressBtn}>＋ 住所を追加する</button>
              )}
            </div>
            {/* 配送方法 */}
            <div style={s.section}>
              <div style={s.sectionTitle}>配送方法の希望</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {SHIP_METHODS.map(({ value, label }) => (
                  <label key={value} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8, border: `2px solid ${shippingMethodPref === value ? "#1a1a1a" : "#e0ddd8"}`, cursor: "pointer", backgroundColor: shippingMethodPref === value ? "#f8f7f5" : "#fff" }}>
                    <input type="radio" checked={shippingMethodPref === value} onChange={() => setShippingMethodPref(value)} style={{ width: 18, height: 18 }} />
                    <span style={{ fontSize: 14, fontWeight: shippingMethodPref === value ? 700 : 400 }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* 送料希望 */}
            <div style={s.section}>
              <div style={s.sectionTitle}>送料の希望</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {FEE_PREFS.map(({ value, label }) => (
                  <label key={value} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8, border: `2px solid ${shippingFeePref === value ? "#1a1a1a" : "#e0ddd8"}`, cursor: "pointer", backgroundColor: shippingFeePref === value ? "#f8f7f5" : "#fff" }}>
                    <input type="radio" checked={shippingFeePref === value} onChange={() => setShippingFeePref(value)} style={{ width: 18, height: 18 }} />
                    <span style={{ fontSize: 14, fontWeight: shippingFeePref === value ? 700 : 400 }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* メモ */}
            <div style={s.section}>
              <div style={s.sectionTitle}>出品者へのメモ（任意）</div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="取引に関するご要望などがあればどうぞ" rows={3}
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #e0ddd8", fontSize: 14, fontFamily: "inherit", resize: "vertical", marginTop: 8, boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={s.footer}>
            <button onClick={onClose} style={s.cancelBtn}>キャンセル</button>
            <LoadingButton onClick={handleSubmit} loading={busy} style={s.submitBtn}>購入リクエストを送る</LoadingButton>
          </div>
        </div>
      </div>
      <SelectAddressModal isOpen={isAddressOpen} onClose={() => setIsAddressOpen(false)} onSelect={(addr) => { setAddress(addr); setIsAddressOpen(false); }} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLoginSuccess={() => { setIsLoginOpen(false); fetchAddress().then((list) => { const def = list[0]; if (def) setAddress(def); }); }} />
    </>
  );
}
