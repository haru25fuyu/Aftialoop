import React from "react";
import { FleaThreadResponse } from "../../../types/FleaMarket";
import { TxPhase } from "../../../conf/FleaMarket";
import { s } from "../../../styles/component/fleaMarket/fleaMarketPhases/PhasePanel.styles";

import WaitPaymentPanel from "./WaitPaymentPanel";
import PaymentPanel from "./PaymentPanel";
import ShippingPanel from "./ShippingPanel";
import CompletePanel from "./CompletePanel";
import CancelledPanel from "./CancelledPanel";

export default function PhasePanel({ data, phase, myUserId, onChanged }: { data: FleaThreadResponse; phase: TxPhase; myUserId: string; onChanged: () => void; }) {
  return (
    <div style={s.wrap}>
      {phase === "WAIT_PAYMENT" && <WaitPaymentPanel data={data} myUserId={myUserId} onChanged={onChanged} />}
      {phase === "PAYMENT" && <PaymentPanel data={data} myUserId={myUserId} onChanged={onChanged} />}
      {(phase === "SHIPPING" || phase === "SHIPPED" || phase === "RATED_BY_BUYER") && <ShippingPanel data={data} myUserId={myUserId} onChanged={onChanged} />}
      {phase === "COMPLETE" && <CompletePanel data={data} />}
      {phase === "CANCELLED" && <CancelledPanel data={data} />}
      {(phase === "UNKNOWN" || phase === "BUYER_WAIT_TERMS" || phase === "BUYER_CONFIRM" || phase === "SELLER_SET_TERMS") && (
        <div style={{ padding: 16, fontSize: 14, color: "#5c5a56" }}>読み込み中…</div>
      )}
    </div>
  );
}
