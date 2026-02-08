// BuyerWaitTermsPanel.tsx
import React from "react";
import { FleaTransactionDetailResponse } from "../../../types/FleaMarket";

export default function BuyerWaitTermsPanel({
    data,
    onChanged,
}: {
    data: FleaTransactionDetailResponse;
    onChanged: () => void;
}) {
    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold">購入者：出品者の条件確定待ち</div>
            <div className="mt-2 text-xs text-gray-500">
                出品者が送料/配送方法を確定すると、ここに同意ボタンが出ます。
            </div>
        </div>
    );
}
