import React from "react";
import { FleaTransactionDetailResponse } from "../../../types/FleaMarket";
import { semantic, spacing, radius, fontSize, fontWeight } from "../../../styles/tokens";

export default function BuyerWaitTermsPanel({ data, onChanged }: { data: FleaTransactionDetailResponse; onChanged: () => void; }) {
  return (
    <div style={{ borderRadius: radius.xl, border: `1px solid ${semantic.borderDefault}`, backgroundColor: semantic.bgSurface, padding: spacing[4] }}>
      <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>購入者：出品者の条件確定待ち</div>
      <div style={{ marginTop: spacing[2], fontSize: fontSize.xs, color: semantic.textMuted }}>出品者が送料/配送方法を確定すると、ここに同意ボタンが出ます。</div>
    </div>
  );
}
