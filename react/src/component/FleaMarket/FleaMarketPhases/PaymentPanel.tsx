import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../../../conf/api";

import { FleaThreadResponse } from "../../../types/FleaMarket";
import { Customer } from "../../../types/Content";
import { FleaContent } from "../../../types/FleaMarket";
import { Payment } from "../../../types/Payment";

import PaymentModal from "../../../modal/EditPayment";

import { LoadingButton } from "../../LoadingButton";

import TransactionChat from "../../TransactionChat";
import CancelTransactionButton from "../../CancelTransactionButton";
import { AxiosError } from "axios";

import { s } from "../../../styles/component/fleaMarket/fleaMarketPhases/PaymentPanel.styles";

// ---------------------------------------------------------
// 型定義の拡張 (any回避)
// ---------------------------------------------------------
interface ExtendedItem extends Omit<FleaContent, "seller_rate"> {
  SellerRate?: number | string;
  sellerRate?: number | string;
  seller_rate?: number | string;
  seller_rate_value?: number | string;
  seller_discount_rate?: number | string;
  additional_discount_rate?: number | string;
  discount_rate?: number | string;
}

interface ApiErrorResponse {
  err_message?: string;
}

// ---------------------------------------------------------
// ヘルパー関数
// ---------------------------------------------------------
//const cn = (...xs: Array<string | false | undefined | null>) =>
//  xs.filter(Boolean).join(" ");
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

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

  const [pointMode, setPointMode] = useState<"full" | "partial" | "none">(
    "full",
  );
  const [usePoints, setUsePoints] = useState(0);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [keyGeneratedAt, setKeyGeneratedAt] = useState(0);

  // キーを新しく発行する関数
  const refreshKey = useCallback(() => {
    setIdempotencyKey(crypto.randomUUID()); // モダンブラウザならこれでOK
    setKeyGeneratedAt(Date.now());
  }, []);

  // 初回ロード時にキーを発行
  useEffect(() => {
    refreshKey();
  }, [refreshKey]);

  // ---------------------------------------------------------
  // Effects: ユーザー情報（ポイント・カード）の取得
  // ---------------------------------------------------------
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [custRes, cardRes] = await Promise.all([
          api.post("customer"),
          api.post("/card/list"),
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

    const coveredYenByPoints = Math.min(
      baseTotalYen,
      pointsToYen(safeUsePoints),
    );
    const cashBeforeDiscount = Math.max(0, baseTotalYen - coveredYenByPoints);
    const discountAmountYen = yenFloor(
      (cashBeforeDiscount * sellerDiscountRate) / 100,
    );
    const cardChargeAmountYen = Math.max(
      0,
      cashBeforeDiscount - discountAmountYen,
    );
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
    if (!computed || !tx || busy) return;
    setError("");

    // 【ロジック】もし前回の発行から5分以上経ってたら念のため更新する、などのガード
    const now = Date.now();
    if (now - keyGeneratedAt > 5 * 60 * 1000) {
      refreshKey();
      setError(
        "セッションの有効期限が切れました。もう一度ボタンを押してください。",
      );
      return;
    }

    const cardChargeAmount = computed.cardChargeAmountYen;
    if (
      (pointMode === "partial" || pointMode === "none") &&
      cardChargeAmount > 0 &&
      !selectCard
    ) {
      setError("クレジットカードを選択してください。");
      return;
    }

    setBusy(true);
    try {
      // APIに idempotency_key として送信
      await api.post(`/flea-market/transactions/${tx.id}/pay`, {
        card_id: cardChargeAmount > 0 ? selectCard : null,
        use_points: computed.safeUsePoints,
        payment_amount: cardChargeAmount,
        idempotency_key: idempotencyKey,
      });

      onChanged();
    } catch (e) {
      // AxiosError型としてキャストし、レスポンスデータの型も指定する
      const error = e as AxiosError<ApiErrorResponse>;
      console.error("決済エラー:", error);

      // ステータスコードに応じたメッセージの切り分け
      if (error.response?.status === 409) {
        // サーバー側で「既に処理済み」と判断された場合
        setError(
          "この決済は既に処理されています。取引状況を確認してください。",
        );
        // 必要に応じて自動で画面を更新（onChanged）させても良いかもしれません
      } else {
        // サーバーからのエラーメッセージがある場合はそれを使い、なければデフォルトを表示
        const serverMsg = error.response?.data?.err_message;
        setError(serverMsg ?? "決済処理に失敗しました。");
      }

      // ★ 冪等性（Idempotency）のポイント
      // 通信エラーや500系エラーの場合、サーバー側で「処理が未完了」の可能性があるため
      // idempotencyKey は更新せず、ユーザーがそのまま「再試行」できるようにします。
      // 同じキーで再送すれば、サーバー側で二重決済を防ぎつつ、未完了分を完了させることができます。
    } finally {
      setBusy(false);
    }
  };

  if (!tx || !item || !computed)
    return <div style={{ padding: 16, color: "#8c8c8c" }}>読み込み中...</div>;

  return (
    <>
      {data.transaction && myUserId && (
        <div style={{ marginTop: 32 }}>
          <TransactionChat
            transactionId={data.transaction.id.toString()}
            myUserId={myUserId}
          />
        </div>
      )}

      <div style={s.wrap}>
        <div style={s.section}>
          <h3 style={s.sectionTitle}>支払い設定</h3>

          {/* 支払い内訳 */}
          <section style={s.section}>
            <div style={s.summaryRow}>
              <span style={{ color: "#5c5a56" }}>お支払い合計</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>
                ¥{computed.baseTotalYen.toLocaleString()}
              </span>
            </div>
            <div
              style={{
                borderTop: `1px solid #e0ddd8`,
                margin: "8px 0",
                paddingTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={s.summaryRow}>
                <span style={s.summaryRow}>ポイント充当</span>
                <span>-{computed.coveredYenByPoints.toLocaleString()}円</span>
              </div>
              {computed.sellerRate !== 1 && (
                <div
                  style={{ textAlign: "right", fontSize: 12, color: "#8c8c8c" }}
                >
                  (レート: {computed.sellerRate}円/pt)
                </div>
              )}
              {computed.discountAmountYen > 0 && (
                <div style={{ ...s.summaryRow, color: "#3a7a22" }}>
                  <span>割引</span>
                  <span>-¥{computed.discountAmountYen.toLocaleString()}</span>
                </div>
              )}
            </div>
            <div style={s.totalRow}>
              <span style={s.totalLabel}>カード請求額</span>
              <span style={s.totalValue}>
                ¥{computed.cardChargeAmountYen.toLocaleString()}
              </span>
            </div>
          </section>

          {/* 支払い方法選択 */}
          <section style={s.section}>
            <h4 style={s.sectionTitle}>ポイント・カード利用設定</h4>

            {/* 全額ポイント */}
            {computed.baseTotalYen <= computed.customerPoint && (
              <label
                style={s.optionLabel(pointMode === "full")}
                onClick={() => setPointMode("full")}
              >
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
                >
                  <input
                    type="radio"
                    checked={pointMode === "full"}
                    onChange={() => setPointMode("full")}
                    style={{ marginTop: 2 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={s.optionTitle}>全額ポイント</div>
                    <div style={s.optionSub}>
                      残高: {computed.customerPoint.toLocaleString()}pt
                    </div>
                  </div>
                </div>
              </label>
            )}

            {/* 一部ポイント */}
            <label
              style={s.optionLabel(pointMode === "partial")}
              onClick={() => setPointMode("partial")}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <input
                  type="radio"
                  checked={pointMode === "partial"}
                  onChange={() => setPointMode("partial")}
                  style={{ marginTop: 2 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={s.optionTitle}>一部ポイント利用</div>
                  <div style={s.optionSub}>
                    残高: {computed.customerPoint.toLocaleString()}pt
                  </div>
                </div>
              </div>
            </label>

            {/* ポイント使用なし */}
            <label
              style={s.optionLabel(pointMode === "none")}
              onClick={() => setPointMode("none")}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <input
                  type="radio"
                  checked={pointMode === "none"}
                  onChange={() => setPointMode("none")}
                  style={{ marginTop: 2 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={s.optionTitle}>カードのみ</div>
                  <div style={s.optionSub}>ポイントを使用しない</div>
                </div>
              </div>
            </label>
          </section>

          {/* カード選択 */}
          {(pointMode === "partial" || pointMode === "none") && (
            <section style={s.section}>
              <h4 style={s.sectionTitle}>カードを選択</h4>
              {paymentList.length === 0 ? (
                <div style={s.emptyCard}>カードが登録されていません</div>
              ) : (
                paymentList.map((p) => (
                  <label
                    key={p.id}
                    style={s.cardOption(selectCard === p.id)}
                    onClick={() => setSelectCard(p.id)}
                  >
                    <input
                      type="radio"
                      checked={selectCard === p.id}
                      onChange={() => setSelectCard(p.id)}
                    />
                    <div>
                      <div style={s.cardLabel}>
                        {p.cardBrand} **** {p.last4}
                      </div>
                      <div style={s.cardSub}>
                        {p.expMonth}/{p.expYear}
                      </div>
                    </div>
                  </label>
                ))
              )}
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "#935c24",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                カードを追加・変更する
              </button>
            </section>
          )}

          {error && <p style={s.errMsg}>{error}</p>}

          <LoadingButton
            loading={busy}
            onClick={handlePay}
            style={{ ...s.payBtn, ...(busy ? s.payBtnBusy : {}) }}
          >
            支払いを確定する
          </LoadingButton>
        </div>

        <div style={s.cancelArea}>
          <CancelTransactionButton
            transactionId={tx.id}
            onCancelled={onChanged}
          />
        </div>
      </div>

      {isPaymentModalOpen && (
        <PaymentModal
          setPayments={setPaymentList}
          id={selectCard}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setReloadTrigger((p) => p + 1);
            setIsPaymentModalOpen(false);
          }}
          openMode="card"
        />
      )}
    </>
  );
}
