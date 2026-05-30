import React from "react";
import { XCircle } from "lucide-react";
import { FleaThreadResponse } from "../../../types/FleaMarket";
import { s } from "../../../styles/component/FleaMarket/FleaMarketPhases/CancelledPanel.styles";

export default function CancelledPanel({ data }: { data: FleaThreadResponse }) {
  const { transaction: tx } = data;
  const reason = tx?.cancel_reason || tx?.cancellation_reason;

  return (
    <div style={s.wrap}>
      <div style={s.banner}>
        <div style={s.bannerInner}>
          <XCircle size={24} />
          <div>
            <h3 style={s.bannerTitle}>取引がキャンセルされました</h3>
            <p style={s.bannerDesc}>この取引はキャンセルとなりました。</p>
          </div>
        </div>
      </div>
      {reason && (
        <div style={s.section}>
          <h4 style={s.sectionTitle}>キャンセル理由</h4>
          <p style={s.reason}>{reason}</p>
        </div>
      )}
    </div>
  );
}
