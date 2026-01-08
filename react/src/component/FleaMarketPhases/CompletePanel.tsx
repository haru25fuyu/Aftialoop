// CompletePanel.tsx
import React from "react";
import { FleaTransactionDetailResponse } from "../../types/FleaMarket";

export default function CompletePanel({ data }: { data: FleaTransactionDetailResponse; onChanged: () => void }) {
    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold">取引完了</div>
            <div className="mt-2 text-xs text-gray-500">評価・領収書・問い合わせ導線などをここに。</div>
        </div>
    );
}
