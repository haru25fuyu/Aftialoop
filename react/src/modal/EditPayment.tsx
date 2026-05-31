import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { X, Save } from "lucide-react";
import api from "../conf/api";
import { Address } from "../types/Address";
import { Payment } from "../types/Payment";
import { LoadingButton } from "../component/LoadingButton";
import { s } from "../styles/modal/EditPayment.styles";

// Stripe公開鍵は環境変数から取得
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const MODE = { CARD: "CARD", Customer: "customer", Delete: "delete" } as const;
type ModeType = (typeof MODE)[keyof typeof MODE];

type Props = {
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  id: string;
  isOpen: boolean;
  onClose: () => void;
  openMode?: string;
};

// ── カード入力フォーム（Stripe Hooks を使うため分離） ─────────────
function CardForm({
  onSuccess,
  onError,
}: {
  onSuccess: (paymentMethodId: string) => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    try {
      // 1. バックエンドから SetupIntent の client_secret を取得
      const res = await api.post("/card/setup-intent");
      const { client_secret } = res.data;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      // 2. Stripe SDK でカードを確認・保存
      const { setupIntent, error } = await stripe.confirmCardSetup(
        client_secret,
        { payment_method: { card: cardElement } },
      );

      if (error) {
        onError(error.message || "カード情報の確認に失敗しました");
        return;
      }

      if (setupIntent?.payment_method) {
        // 3. PaymentMethod ID をバックエンドに送信
        onSuccess(setupIntent.payment_method as string);
      }
    } catch {
      onError("カード保存に失敗しました。後ほど再試行してください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 style={s.title}>クレジットカード情報の登録</h2>
      <div
        style={{
          padding: "14px 16px",
          border: "1px solid #e0ddd8",
          borderRadius: 8,
          backgroundColor: "#f8f7f5",
          marginBottom: 24,
        }}
      >
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#1a1a1a",
                fontFamily: "system-ui, -apple-system, sans-serif",
                "::placeholder": { color: "#c4c1bb" },
              },
              invalid: { color: "#d63c20" },
            },
            hidePostalCode: true,
          }}
        />
      </div>
      <LoadingButton
        onClick={handleSubmit}
        loading={isSubmitting}
        disabled={!stripe}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 12,
          backgroundColor: "#1a1a1a",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          cursor: "pointer",
          fontSize: 16,
        }}
      >
        カードを追加
      </LoadingButton>
    </div>
  );
}

// ── メインコンポーネント ───────────────────────────────────────────
export default function PaymentModal({
  setPayments,
  id,
  isOpen,
  onClose,
  openMode,
}: Props) {
  const [mode, setMode] = useState<ModeType>(MODE.CARD);
  const [cardId, setCardId] = useState<string>("");
  const [created, setCreated] = useState(false);
  const [address, setAddress] = useState<Address[]>([]);
  const [selectAddressID, setSelectAddressID] = useState<string | number>("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [defaultCard, setDefaultCard] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const m =
      openMode === "delete"
        ? MODE.Delete
        : openMode === "customer"
          ? MODE.Customer
          : MODE.CARD;
    setMode(m);
    if (m === MODE.Customer) {
      api
        .post("/address/list")
        .then((res) => setAddress(res.data.address || []))
        .catch(console.error);
    }
    api
      .post("customer")
      .then((res) => {
        setDefaultCard(res.data.user?.defaultCard || "");
      })
      .catch(console.error);
    return () => {
      document.body.style.overflow = "";
    };
  }, [id, isOpen, openMode]);

  // カード追加成功 → PaymentMethod ID をバックエンドに保存
  const handleCardSuccess = async (paymentMethodId: string) => {
    try {
      const res = await api.post("/card/save", { paymentMethodId });
      setMode(MODE.Customer);
      setCardId(paymentMethodId);
      setCreated(true);
      setPayments(res.data.card);
      api
        .post("/address/list")
        .then((res) => setAddress(res.data.address || []))
        .catch(console.error);
    } catch {
      alert("カード保存に失敗しました。後ほど再試行してください。");
    }
  };

  const saveAddress = async () => {
    if (!selectAddressID) {
      alert("住所が選択されていません。");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post("/card/address", {
        addressID: selectAddressID,
        cardID: cardId,
      });
      setPayments(res.data.card);
      if (makeDefault) {
        const r = await api.post("/card/default", { cardID: cardId });
        setPayments(r.data.card);
      }
      onClose();
    } catch {
      alert("住所保存に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post("/card/delete", { cardId: id });
      setPayments(res.data.card);
      onClose();
    } catch {
      alert("削除に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const Close = () => {
    // カード追加途中でキャンセルした場合はカードを削除
    if (mode === MODE.Customer && created) {
      api
        .post("/card/delete", { cardId: cardId })
        .then((res) => setPayments(res.data.card))
        .catch(console.error);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={s.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) Close();
      }}
    >
      <div style={s.card}>
        <button onClick={Close} disabled={isSubmitting} style={s.closeBtn}>
          <X size={20} />
        </button>
        <div style={s.body}>
          {/* ── カード追加 ── */}
          {mode === MODE.CARD && (
            <Elements stripe={stripePromise}>
              <CardForm
                onSuccess={handleCardSuccess}
                onError={(msg) => alert(msg)}
              />
            </Elements>
          )}

          {/* ── 住所選択 ── */}
          {mode === MODE.Customer && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                maxHeight: "75vh",
              }}
            >
              <h2 style={{ ...s.title, textAlign: "center" }}>支払先住所</h2>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  backgroundColor: "#f8f7f5",
                  border: "1px solid #f0eeeb",
                  borderRadius: 24,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  minHeight: 300,
                }}
              >
                {address.map((item) => (
                  <label
                    key={item.id}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "flex-start",
                      padding: 20,
                      backgroundColor: "#fff",
                      border: `2px solid ${
                        selectAddressID === item.id ? "#1a1a1a" : "transparent"
                      }`,
                      borderRadius: 16,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    <input
                      type="radio"
                      name="address"
                      style={{
                        marginTop: 4,
                        width: 20,
                        height: 20,
                        cursor: "pointer",
                      }}
                      checked={selectAddressID === item.id}
                      onChange={() => setSelectAddressID(item.id)}
                    />
                    <div style={{ marginLeft: 16 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 18,
                          color: "#1a1a1a",
                          marginBottom: 4,
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#8c8c8c",
                          marginBottom: 8,
                        }}
                      >
                        〒{item.post_code}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: "#5c5a56",
                          lineHeight: 1.6,
                        }}
                      >
                        {item.pref} {item.address1} {item.address2}{" "}
                        {item.address3}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div
                style={{
                  flexShrink: 0,
                  paddingTop: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: 20,
                    border: "1px solid #f0eeeb",
                    borderRadius: 16,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={makeDefault}
                    onChange={(e) => setMakeDefault(e.target.checked)}
                    style={{ width: 24, height: 24 }}
                  />
                  <span
                    style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}
                  >
                    このカードをデフォルトにする
                  </span>
                </label>
                <LoadingButton
                  onClick={saveAddress}
                  loading={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "18px 0",
                    backgroundColor: "#1a1a1a",
                    color: "#fff",
                    borderRadius: 16,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontSize: 16,
                  }}
                >
                  <Save size={20} />
                  保存して終了
                </LoadingButton>
              </div>
            </div>
          )}

          {/* ── カード削除 ── */}
          {mode === MODE.Delete && (
            <div>
              <h2 style={s.title}>お支払い方法を削除</h2>
              {id === defaultCard ? (
                <div
                  style={{
                    padding: 16,
                    backgroundColor: "#fef0ec",
                    border: "1px solid #f0a890",
                    color: "#d63c20",
                    borderRadius: 8,
                    fontSize: 14,
                    marginBottom: 24,
                  }}
                >
                  このカードはデフォルトです。削除するとデフォルト設定が解除されます。
                </div>
              ) : (
                <p style={{ color: "#5c5a56", fontSize: 14, marginBottom: 24 }}>
                  このカードを削除してよいですか？
                </p>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={Close}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    borderRadius: 12,
                    border: "1px solid #e0ddd8",
                    backgroundColor: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  キャンセル
                </button>
                <LoadingButton
                  onClick={handleDelete}
                  loading={isSubmitting}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    borderRadius: 12,
                    backgroundColor: "#d63c20",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
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
