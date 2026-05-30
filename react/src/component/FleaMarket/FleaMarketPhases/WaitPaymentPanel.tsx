import React from "react";
import { Clock, AlertTriangle, CreditCard } from "lucide-react";
import { FleaThreadResponse } from "../../../types/FleaMarket";
import { s } from "../../../styles/component/FleaMarket/FleaMarketPhases/WaitPaymentPanel.styles";
import TransactionChat from "../../TransactionChat";
import CancelTransactionButton from "../../CancelTransactionButton";

export default function WaitPaymentPanel({ data, myUserId, onChanged }: { data: FleaThreadResponse; myUserId: string; onChanged: () => void; }) {
  const { transaction } = data;
  const itemPrice = transaction?.price_item ?? 0;
  const shippingPrice = transaction?.price_shipping ?? 0;
  const isShippingIncluded = transaction?.shipping_fee_type === "INCLUDED";
  const total = itemPrice + shippingPrice;

  return (
    <div style={s.wrap}>
      <div style={s.banner}>
        <div style={s.bannerInner}>
          <Clock size={24} style={{ flexShrink: 0, marginTop: 4 }} />
          <div>
            <h3 style={s.bannerTitle}>購入者の支払い待ちです</h3>
            <p style={s.bannerDesc}>購入者が支払い手続きを進めています。支払いが完了するまで、商品の発送はお待ちください。</p>
          </div>
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionHeader}>
          <h4 style={s.sectionTitle}><CreditCard size={16} />取引情報の確認</h4>
        </div>
        <div style={s.sectionBody}>
          <div style={s.row}><span style={s.rowLabel}>商品価格</span><span style={s.rowValue}>¥{itemPrice.toLocaleString()}</span></div>
          <div style={s.row}><span style={s.rowLabel}>送料（{isShippingIncluded ? "送料込み" : "着払い"}）</span><span style={s.rowValue}>{shippingPrice > 0 ? `¥${shippingPrice.toLocaleString()}` : "¥0"}</span></div>
          <div style={{ height: 1, borderTop: "1px dashed #c4c1bb", margin: "8px 0" }} />
          <div style={s.totalRow}><span style={s.rowLabel}>合計金額</span><span style={s.totalValue}>¥{total.toLocaleString()}</span></div>
        </div>
      </div>

      <div style={{ ...s.section, borderColor: "#f0c4c4" }}>
        <div style={s.sectionBody}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <AlertTriangle size={20} style={{ color: "#d63c20", flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 14, color: "#5c5a56" }}>
              <p style={{ fontWeight: 700, color: "#d63c20", marginBottom: 4 }}>ご注意ください</p>
              <p>支払いが完了する前に商品を発送してしまうと、トラブルの原因となります。必ず「支払い完了」の通知が来てから発送作業を行ってください。</p>
            </div>
          </div>
        </div>
      </div>

      {data.transaction && myUserId && (
        <div style={{ marginTop: 32 }}>
          <TransactionChat transactionId={data.transaction.id.toString()} myUserId={myUserId} />
        </div>
      )}

      <div style={s.cancelArea}>
        <CancelTransactionButton transactionId={transaction?.id || 0} onCancelled={onChanged} />
      </div>
    </div>
  );
}
