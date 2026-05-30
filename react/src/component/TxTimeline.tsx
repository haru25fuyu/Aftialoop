import React from "react";
import { TxPhase } from "../conf/FleaMarket";
import { CreditCard, Package, Truck, Check } from "lucide-react";
import { s } from "../styles/component/TxTimeline.styles";

const steps = [
  { key: "PAYMENT", label: "決済", icon: CreditCard },
  { key: "SHIPPING", label: "発送", icon: Package },
  { key: "SHIPPED", label: "受取", icon: Truck },
  { key: "RATED_BY_BUYER", label: "評価", icon: Check },
  { key: "COMPLETE", label: "完了", icon: Check },
] as const;

function idxOf(phase: TxPhase) {
  if (phase === "BUYER_WAIT_TERMS") return 0;
  const i = steps.findIndex((s) => s.key === phase);
  return i >= 0 ? i : 0;
}

export default function TxTimeline({ phase }: { phase: TxPhase }) {
  if (phase === "CANCELLED") return null;
  const currentIdx = idxOf(phase);
  const progressPercent = (currentIdx / (steps.length - 1)) * 100;

  return (
    <div style={s.wrap}>
      <div style={s.track}>
        <div style={s.trackBg}><div style={s.trackProgress(progressPercent)} /></div>
        <div style={s.steps}>
          {steps.map((step, i) => {
            const state = i < currentIdx ? "completed" : i === currentIdx ? "current" : "future";
            const Icon = step.icon;
            return (
              <div key={step.key} style={s.stepWrap}>
                <div style={s.circle(state)}>
                  {state === "completed" ? <Check size={18} strokeWidth={3} /> : <Icon size={18} strokeWidth={state === "current" ? 2.5 : 2} />}
                </div>
                <div style={s.label(state !== "future")}>{step.label}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}
