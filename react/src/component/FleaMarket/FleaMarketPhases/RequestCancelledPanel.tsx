import React from "react";
import { s } from "../../../styles/component/FleaMarket/FleaMarketPhases/RequestCancelledPanel.styles";

type Props = { status: string; reason?: string; };

export function RequestCancelledPanel({ status, reason }: Props) {
  const label = status === "REJECTED" ? "申請が断られました" : status === "WITHDRAWN" ? "申請を取り下げました" : "申請がキャンセルされました";
  return (
    <div style={s.wrap}>
      <div style={s.banner}>
        <div style={s.bannerInner}>
          <div>
            <h3 style={s.bannerTitle}>{label}</h3>
            {reason && <p style={s.bannerDesc}>{reason}</p>}
          </div>
        </div>
      </div>
      {reason && (
        <div style={s.section}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#5c5a56", marginBottom: 8 }}>理由</h4>
          <p style={s.reason}>{reason}</p>
        </div>
      )}
    </div>
  );
}
