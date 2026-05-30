import React from "react";

import {
  SHIPPING_CARRIERS,
  SHIPPING_CARRIER_OPTIONS,
  ChangeTxStatustoShipped,
  RateTransactionByBuyer,
  CompleteTransactionBySeller,
} from "../../../conf/FleaMarket";

import { FleaThreadResponse } from "../../../types/FleaMarket";
import { Address } from "../../../types/Address";

import FleaReviewModal from "../../../modal/FleaReviewModal";
//import { TransactionChat } from "../../TransactionChat";
import { LoadingButton } from "../../LoadingButton";

import { s } from "../../../styles/component/fleaMarket/fleaMarketPhases/CompletePanel.styles";

// 日付フォーマット用
function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// 配送業者コードからラベルを取得するヘルパー
function getCarrierLabel(key: string | null | undefined) {
  if (!key) return "指定なし";
  const found = SHIPPING_CARRIER_OPTIONS.find((opt) => opt.id === key);
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
  if (!tx || !["PAID", "SHIPPED", "RATED_BY_BUYER"].includes(tx.status))
    return null;

  // 出品者: 発送通知
  const handleShip = async () => {
    if (!carrier) {
      alert("配送業者を選択してください");
      return;
    }
    if (!confirm("商品を発送しましたか？購入者に通知を送ります。")) return;

    setIsSubmitting(true);
    try {
      await ChangeTxStatustoShipped(carrier, trackingNumber, tx?.id || 0);
      alert("発送通知を送信しました");
      onChanged();
    } catch (err) {
      alert("エラーが発生しました");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div style={{ marginTop: 32 }}>
          <TransactionChat
            purchase_request_id={data.transaction.purchase_request_id.toString()}
            myUserId={myUserId}
          />
        </div>
      )}

      <div style={s.section}>
        {/* ヘッダー */}
        <div style={s.sectionHeader}>
          <h3 style={s.sectionTitle}>
            {isRatedByBuyer ? (
              <>{isSeller ? "購入者を評価してください" : "出品者の評価待ち"}</>
            ) : isShipped ? (
              <>{isSeller ? "発送済みです" : "商品が発送されました"}</>
            ) : (
              <>
                {isSeller ? "商品を発送してください" : "発送をお待ちください"}
              </>
            )}
          </h3>
          <p style={s.infoRow}>
            {isShipped
              ? isSeller
                ? "購入者の受取評価をお待ちください。"
                : "商品が届いたら中身を確認し、受取評価を行ってください。"
              : isSeller
                ? "梱包して指定の配送方法で発送しましょう。"
                : "出品者が発送準備中です。"}
          </p>
        </div>

        {/* 出品者の表示 */}
        {isSeller && (
          <div style={s.sectionBody}>
            <AddressCard address={address} title="配送先住所" />

            {/* A. 購入者が評価済み → 出品者評価待ち */}
            {isRatedByBuyer && (
              <div
                style={{
                  ...s.section,
                  backgroundColor: "#fdf5e8",
                  borderColor: "#f3cc88",
                }}
              >
                <h4
                  style={{
                    fontWeight: 700,
                    color: "#935c24",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  購入者が受取評価を完了しました
                </h4>
                <p
                  style={{
                    fontSize: 14,
                    color: "#6b421a",
                    marginBottom: 16,
                    lineHeight: 1.6,
                  }}
                >
                  購入者が商品を受け取り、評価を行いました。
                  <br />
                  <strong>
                    あなたの評価を送信すると、取引が完了し売上金が反映されます。
                  </strong>
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={s.completeBtn}
                >
                  購入者を評価して取引を完了する
                </button>
              </div>
            )}

            {/* B. 発送済み (Read Only) */}
            {isShipped && !isRatedByBuyer && (
              <div style={s.section}>
                <div
                  style={{
                    ...s.sectionTitle,
                    borderBottom: `1px solid #e0ddd8`,
                    paddingBottom: 8,
                    marginBottom: 12,
                  }}
                >
                  発送情報
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 12,
                    fontSize: 14,
                  }}
                >
                  <div>
                    <div style={s.infoLabel}>配送業者</div>
                    <div style={s.infoValue}>
                      {getCarrierLabel(
                        tx.shipping_carrier as SHIPPING_CARRIERS | undefined,
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={s.infoLabel}>追跡番号</div>
                    <div
                      style={{
                        ...s.infoValue,
                        fontFamily: "monospace",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {tx.tracking_number || "なし"}
                    </div>
                  </div>
                  <div>
                    <div style={s.infoLabel}>発送日時</div>
                    <div style={s.infoValue}>{formatDate(tx.shipped_at)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* C. 未発送 → 入力フォーム */}
            {!isShipped && !isRatedByBuyer && (
              <div style={{ ...s.section, backgroundColor: "#f8f7f5" }}>
                <div style={{ marginBottom: 12 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      fontWeight: 500,
                      marginBottom: 4,
                    }}
                  >
                    配送業者 <span style={{ color: "#d63c20" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      style={s.select}
                      value={carrier}
                      onChange={(e) =>
                        setCarrier(e.target.value as SHIPPING_CARRIERS)
                      }
                    >
                      <option value="" disabled>
                        選択してください
                      </option>
                      {SHIPPING_CARRIER_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      fontWeight: 500,
                      marginBottom: 4,
                    }}
                  >
                    追跡番号 (任意)
                  </label>
                  <input
                    type="text"
                    placeholder="1234-5678-9012"
                    style={s.input}
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                </div>
                <LoadingButton
                  onClick={handleShip}
                  disabled={!carrier}
                  loading={isSubmitting}
                  style={s.shipBtn}
                >
                  商品を発送したので通知する
                </LoadingButton>
              </div>
            )}
          </div>
        )}

        {/* 購入者の表示 */}
        {isBuyer && (
          <div style={s.sectionBody}>
            {/* A. 評価済み → 待機 */}
            {isRatedByBuyer && (
              <div
                style={{
                  ...s.section,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    backgroundColor: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid #e0ddd8`,
                  }}
                >
                  <span style={{ color: "#8c8c8c", fontSize: 24 }}>⏳</span>
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, color: "#1a1a1a" }}>
                    評価を送信しました
                  </h4>
                  <p style={{ fontSize: 14, color: "#8c8c8c", marginTop: 4 }}>
                    出品者からの評価をお待ちください。
                  </p>
                </div>
              </div>
            )}

            {/* B. 発送済み → 受取評価ボタン */}
            {isShipped && !isRatedByBuyer && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div style={{ ...s.section, backgroundColor: "#f8f7f5" }}>
                  <div
                    style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}
                  >
                    配送状況
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 16,
                      fontSize: 14,
                    }}
                  >
                    <div>
                      <span style={s.infoLabel}>配送業者</span>
                      <span style={s.infoValue}>
                        {getCarrierLabel(
                          tx.shipping_carrier as SHIPPING_CARRIERS | undefined,
                        )}
                      </span>
                    </div>
                    <div>
                      <span style={s.infoLabel}>追跡番号</span>
                      <span style={{ ...s.infoValue, fontFamily: "monospace" }}>
                        {tx.tracking_number || "なし"}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{ fontSize: 14, color: "#5c5a56", marginBottom: 12 }}
                  >
                    商品の中身を確認し、問題がなければ受取評価を行って取引を完了してください。
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    style={s.completeBtn}
                  >
                    商品を受け取ったので評価する
                  </button>
                </div>
              </div>
            )}

            {/* C. 未発送 */}
            {!isShipped && !isRatedByBuyer && (
              <div
                style={{
                  ...s.section,
                  backgroundColor: "#f8f7f5",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0, color: "#8c8c8c" }}>
                  📦
                </span>
                <div style={{ fontSize: 14 }}>
                  <p style={{ fontWeight: 500, marginBottom: 4 }}>
                    発送期限: {formatDate(tx?.paid_at ?? "")}から数日以内
                  </p>
                  <p style={{ color: "#5c5a56" }}>
                    出品者からの発送通知をお待ちください。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={s.cancelArea}>
        <CancelTransactionButton
          transactionId={tx.id}
          onCancelled={onChanged}
        />
      </div>

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
    <div
      style={{
        border: `1px solid #e0ddd8`,
        borderRadius: 12,
        padding: 16,
        backgroundColor: "#f8f7f5",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        📍 {title}
      </div>
      <div
        style={{
          fontSize: 14,
          paddingLeft: 24,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ fontWeight: 700 }}>〒 {address.post_code}</div>
        <div>
          {address.pref} {address.address1} {address.address2}
        </div>
        <div>{address.address3}</div>
        <div style={{ paddingTop: 4, fontWeight: 500 }}>{address.name} 様</div>
      </div>
    </div>
  );
}
