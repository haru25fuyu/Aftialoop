// CancelledPanel.tsx
import React from "react";
import { FleaTransactionDetailResponse } from "../../types/FleaMarket";

export default function CancelledPanel({ data }: { data: FleaTransactionDetailResponse }) {
    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-red-600">キャンセル済み</div>
            <div className="mt-2 text-xs text-gray-500">理由・履歴の表示は後で。</div>
        </div>
    );
}
