import React from "react";
import { TxPhase } from "../conf/FleaMarket";

const steps: Array<{ key: TxPhase; label: string }> = [
    { key: "SELLER_SET_TERMS", label: "条件確定" },
    { key: "BUYER_CONFIRM", label: "同意" },
    { key: "PAYMENT", label: "決済" },
    { key: "SHIPPING", label: "発送/受取" },
    { key: "COMPLETE", label: "完了" },
];

function idxOf(phase: TxPhase) {
    if (phase === "BUYER_WAIT_TERMS") return 0;
    const i = steps.findIndex((s) => s.key === phase);
    return i >= 0 ? i : 0;
}

export default function TxTimeline({ phase }: { phase: TxPhase }) {
    if (phase === "CANCELLED") return null;

    const cur = idxOf(phase);

    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-medium mb-3">進捗</div>
            <div className="flex items-center gap-2 overflow-x-auto">
                {steps.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-2">
                        <div
                            className={[
                                "h-7 px-3 rounded-full border text-xs flex items-center whitespace-nowrap",
                                i <= cur ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600",
                            ].join(" ")}
                        >
                            {s.label}
                        </div>
                        {i !== steps.length - 1 ? <div className="h-[1px] w-6 bg-gray-200" /> : null}
                    </div>
                ))}
            </div>
        </div>
    );
}
