import React from "react";
import { TxPhase } from "../conf/FleaMarket";
import { CreditCard, Package, Truck, Check } from "lucide-react";

// ステップ定義にアイコンを追加
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
    // マッチしない場合は完了扱いか初期扱いか要件によりますが、ここでは安全策で0
    return i >= 0 ? i : 0;
}

export default function TxTimeline({ phase }: { phase: TxPhase }) {
    if (phase === "CANCELLED") return null;

    const currentIdx = idxOf(phase);

    // 進捗バーの長さを計算 (ステップ間の数に基づいてパーセント計算)
    // 例: 4ステップ(間隔は3つ)で、現在インデックスが1なら 1/3 * 100 = 33%
    const progressPercent = (currentIdx / (steps.length - 1)) * 100;

    return (
        <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
            <div className="relative">
                {/* 背景のグレー線（全期間） */}
                <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 px-2">
                    <div className="h-1 w-full bg-gray-100 rounded-full" />
                </div>

                {/* 進捗の黒い線（完了した期間） */}
                <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 px-2">
                    <div
                        className="h-1 bg-black rounded-full transition-all duration-500 ease-in-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* ステップアイコンの配置 */}
                <div className="relative flex justify-between w-full">
                    {steps.map((step, i) => {
                        const isCompleted = i < currentIdx;
                        const isCurrent = i === currentIdx;
                        const isFuture = i > currentIdx;

                        const Icon = step.icon;

                        return (
                            <div key={step.key} className="flex flex-col items-center gap-2 group">
                                {/* アイコンサークル */}
                                <div
                                    className={`
                                        w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all duration-300
                                        ${isCompleted || isCurrent ? "border-black" : "border-gray-200 bg-white"}
                                        ${isCompleted ? "bg-black text-white" : ""}
                                        ${isCurrent ? "bg-white text-black ring-4 ring-gray-100 scale-110" : ""}
                                        ${isFuture ? "text-gray-300" : ""}
                                    `}
                                >
                                    {isCompleted ? (
                                        <Check size={18} strokeWidth={3} />
                                    ) : (
                                        <Icon size={18} strokeWidth={isCurrent ? 2.5 : 2} />
                                    )}
                                </div>

                                {/* ラベル */}
                                <div className={`
                                    text-xs font-medium transition-colors duration-300 absolute -bottom-6 w-20 text-center
                                    ${isCompleted || isCurrent ? "text-black" : "text-gray-400"}
                                    ${isCurrent ? "font-bold" : ""}
                                `}>
                                    {step.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* レイアウト調整用（ラベルが絶対配置ではみ出すのを防ぐためのパディング） */}
            <div className="h-4" />
        </div>
    );
}