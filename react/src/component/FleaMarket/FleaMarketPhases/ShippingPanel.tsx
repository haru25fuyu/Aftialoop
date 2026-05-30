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
import TransactionChat from "../../TransactionChat";
import { LoadingButton } from "../../LoadingButton";

import { s } from "../../../styles/component/fleaMarket/fleaMarketPhases/ShippingPanel.styles";

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

function getCarrierLabel(key: string | null | undefined) {
  if (!key) return "指定なし";
  const found = SHIPPING_CARRIER_OPTIONS.find((opt) => opt.id === key);
  return found ? found.label : key;
}

function AddressCard({
  address,
  title,
}: {
  address: Address | null | undefined;
  title: string;
}) {
  if (!address) return null;
  return (
    <div style={s.sectionBody}>
      <p style={s.infoLabel}>{title}</p>
      <p style={s.infoValue}>{address.name}</p>
      <p style={s.infoValue}>
        〒{address.post_code} {address.pref}
        {address.address1}
        {address.address2}
      </p>
      <p style={s.infoValue}>{address.phone}</p>
    </div>
  );
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

  const [carrier, setCarrier] = React.useState<SHIPPING_CARRIERS | "">("");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  if (!tx || !["PAID", "SHIPPED", "RATED_BY_BUYER"].includes(tx.status))
    return null;

  const handleReviewSubmit = async (rating: number, comment: string) => {
    try {
      if (isBuyer) {
        await RateTransactionByBuyer(tx.id, rating, comment);
        alert("評価を送信しました。出品者からの評価をお待ちください。");
      } else if (isSeller) {
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
  const isShipped = tx.status === "SHIPPED";
  const isRatedByBuyer = tx.status === "RATED_BY_BUYER";

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

  return (
    <>
      {tx && myUserId && (
        <div style={{ marginTop: 32 }}>
          <TransactionChat
            transactionId={tx.id.toString()}
            myUserId={myUserId}
          />
        </div>
      )}

      <div style={s.section}>
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

        {/* 出品者 */}
        {isSeller && (
          <div style={s.sectionBody}>
            <AddressCard address={address} title="配送先住所" />

            {/* 発送済みの場合: 追跡情報表示 */}
            {isShipped && (
              <div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>配送業者</span>
                  <span style={s.infoValue}>
                    {getCarrierLabel(tx.shipping_carrier)}
                  </span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>追跡番号</span>
                  <span style={s.infoValue}>
                    {tx.tracking_number || "なし"}
                  </span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>発送日時</span>
                  <span style={s.infoValue}>{formatDate(tx.shipped_at)}</span>
                </div>
              </div>
            )}

            {/* 未発送: 発送フォーム */}
            {!isShipped && !isRatedByBuyer && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div>
                  <p style={s.infoLabel}>配送業者</p>
                  <select
                    value={carrier}
                    onChange={(e) =>
                      setCarrier(e.target.value as SHIPPING_CARRIERS)
                    }
                    style={s.select}
                  >
                    <option value="">選択してください</option>
                    {SHIPPING_CARRIER_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p style={s.infoLabel}>追跡番号（任意）</p>
                  <input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="追跡番号を入力"
                    style={s.input}
                  />
                </div>
                <LoadingButton
                  onClick={handleShip}
                  loading={isSubmitting}
                  style={s.shipBtn}
                >
                  発送通知を送る
                </LoadingButton>
              </div>
            )}

            {/* 出品者: 評価ボタン */}
            {isRatedByBuyer && (
              <LoadingButton
                onClick={() => setIsModalOpen(true)}
                loading={false}
                style={s.completeBtn}
              >
                購入者を評価して取引完了
              </LoadingButton>
            )}
          </div>
        )}

        {/* 購入者 */}
        {isBuyer && (
          <div style={s.sectionBody}>
            {isShipped && (
              <>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>配送業者</span>
                  <span style={s.infoValue}>
                    {getCarrierLabel(tx.shipping_carrier)}
                  </span>
                </div>
                {tx.tracking_number && (
                  <div style={s.infoRow}>
                    <span style={s.infoLabel}>追跡番号</span>
                    <span
                      style={{
                        ...s.infoValue,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {tx.tracking_number}
                      <span style={s.trackingBadge}>追跡可能</span>
                    </span>
                  </div>
                )}
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>発送日時</span>
                  <span style={s.infoValue}>{formatDate(tx.shipped_at)}</span>
                </div>
                {!isRatedByBuyer && (
                  <LoadingButton
                    onClick={() => setIsModalOpen(true)}
                    loading={false}
                    style={s.completeBtn}
                  >
                    受取評価をして取引完了
                  </LoadingButton>
                )}
                {isRatedByBuyer && (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#3a7a22",
                      fontWeight: 700,
                      padding: "12px 0",
                    }}
                  >
                    ✓ 受取評価済み。出品者の評価をお待ちください。
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div style={s.cancelArea}>
        <p style={{ fontSize: 12, color: "#8c8c8c", textAlign: "center" }}>
          取引に問題がある場合はサポートへお問い合わせください
        </p>
      </div>

      <FleaReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleReviewSubmit}
      />
    </>
  );
}
