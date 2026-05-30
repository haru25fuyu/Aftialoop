import React, { useEffect, useState } from "react";
import axios from "axios";
import { PaymentForm, CreditCard } from "@square/web-payments-sdk-react";
import { X, Save } from "lucide-react";
import api from "../conf/api";
import { Address } from "../types/Address";
import { LoadingButton } from "../component/LoadingButton";
import { s } from "../styles/modal/EditPayment.styles";

const MODE = { CARD: "CARD", Customer: "customer", Delete: "delete" } as const;
type ModeType = typeof MODE[keyof typeof MODE];

type Props = { setPayments: React.Dispatch<React.SetStateAction<any[]>>; id: string; isOpen: boolean; onClose: () => void; openMode?: string; };

export default function SquarePayment({ setPayments, id, isOpen, onClose, openMode }: Props) {
  const [mode, setMode] = useState<ModeType>(MODE.CARD);
  const [userId, setUserId] = useState<string>("");
  const [cardId, setCardId] = useState<string>("");
  const [created, setCreated] = useState(false);
  const [address, setAddress] = useState<Address[]>([]);
  const [selectAddressID, setSelectAddressID] = useState<string | number>("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [defaultCard, setDefaultCard] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const m = openMode === "delete" ? MODE.Delete : openMode === "customer" ? MODE.Customer : MODE.CARD;
    setMode(m);
    if (m === MODE.Customer) {
      api.post('/address/list').then(res => setAddress(res.data.address || [])).catch(console.error);
    }
    api.post("customer").then(res => {
      setUserId(res.data.user?.id || "");
      setDefaultCard(res.data.user?.defaultCard || "");
      setIsDefault(res.data.user?.defaultCard === id);
    }).catch(console.error);
    return () => { document.body.style.overflow = ''; document.body.style.paddingRight = ''; };
  }, [id, isOpen, openMode]);

  const saveCard = async (token: string | undefined, verificationToken: string) => {
    if (!token || token === "undefined") { alert("カード入力に問題があります。全ての項目を正しく入力してください。"); return; }
    try {
      const res = await api.post("/card/save", { token, userId, verificationToken });
      setMode(MODE.Customer); setCardId(res.data.card); setCreated(true);
      api.post('/address/list').then(res => setAddress(res.data.address || [])).catch(console.error);
    } catch (e) { alert("カード保存に失敗しました。後ほど再試行してください。"); }
  };

  const saveAddress = async () => {
    if (!selectAddressID) { alert("住所が選択されていません。"); return; }
    setIsSubmitting(true);
    try {
      const res = await api.post("/card/address", { addressID: selectAddressID, cardID: cardId });
      setPayments(res.data.card);
      if (makeDefault) { const r = await api.post("/card/default", { cardID: cardId }); setPayments(r.data.card); }
      onClose();
    } catch { alert("住所保存に失敗しました。"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try { const res = await api.post("/card/delete", { cardId: id }); setPayments(res.data.card); onClose(); }
    catch { alert("削除に失敗しました。"); }
    finally { setIsSubmitting(false); }
  };

  const Close = () => {
    if (mode === MODE.Customer && created) {
      api.post("/card/delete", { cardId }).then(res => setPayments(res.data.card)).catch(console.error);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={s.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget && !isSubmitting) Close(); }}>
      <div style={s.card}>
        <button onClick={Close} disabled={isSubmitting} style={s.closeBtn}><X size={20} /></button>
        <div style={s.body}>
          {mode === MODE.CARD && (
            <div>
              <h2 style={s.title}>クレジットカード情報の登録</h2>
              <PaymentForm applicationId="sandbox-sq0idb-yy0CGDaAdgYJQzH0n8Uj4A" locationId="LN0P8AEE480X5"
                cardTokenizeResponseReceived={({ token, verificationToken }) => saveCard(token, verificationToken)}>
                <CreditCard />
              </PaymentForm>
            </div>
          )}
          {mode === MODE.Customer && (
            <div style={{ display: "flex", flexDirection: "column", maxHeight: "75vh" }}>
              <h2 style={{ ...s.title, textAlign: "center" }}>支払先住所</h2>
              <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#f8f7f5", border: "1px solid #f0eeeb", borderRadius: 24, padding: 16, display: "flex", flexDirection: "column", gap: 16, minHeight: 300 }}>
                {address.map((item) => (
                  <label key={item.id} style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", padding: 20, backgroundColor: "#fff", border: `2px solid ${selectAddressID === item.id ? "#1a1a1a" : "transparent"}`, borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <input type="radio" name="address" style={{ marginTop: 4, width: 20, height: 20, cursor: "pointer" }} checked={selectAddressID === item.id} onChange={() => setSelectAddressID(item.id)} />
                    <div style={{ marginLeft: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a1a", marginBottom: 4 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 8 }}>〒{item.post_code}</div>
                      <div style={{ fontSize: 14, color: "#5c5a56", lineHeight: 1.6 }}>{item.pref} {item.address1} {item.address2} {item.address3}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ flexShrink: 0, paddingTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 16, padding: 20, border: "1px solid #f0eeeb", borderRadius: 16, cursor: "pointer" }}>
                  <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} style={{ width: 24, height: 24 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>このカードをデフォルトにする</span>
                </label>
                <LoadingButton onClick={saveAddress} loading={isSubmitting}
                  style={{ width: "100%", padding: "18px 0", backgroundColor: "#1a1a1a", color: "#fff", borderRadius: 16, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 16 }}>
                  <Save size={20} />保存して終了
                </LoadingButton>
              </div>
            </div>
          )}
          {mode === MODE.Delete && (
            <div>
              <h2 style={s.title}>お支払い方法を削除</h2>
              {id === defaultCard ? (
                <div style={{ padding: 16, backgroundColor: "#fef0ec", border: "1px solid #f0a890", color: "#d63c20", borderRadius: 8, fontSize: 14, marginBottom: 24 }}>
                  このカードはデフォルトです。削除するとデフォルト設定が解除されます。
                </div>
              ) : (
                <p style={{ color: "#5c5a56", fontSize: 14, marginBottom: 24 }}>このカードを削除してよいですか？</p>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={Close} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid #e0ddd8", backgroundColor: "#fff", fontWeight: 700, cursor: "pointer" }}>キャンセル</button>
                <LoadingButton onClick={handleDelete} loading={isSubmitting}
                  style={{ flex: 1, padding: "12px 0", borderRadius: 12, backgroundColor: "#d63c20", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>
                  削除する
                </LoadingButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
