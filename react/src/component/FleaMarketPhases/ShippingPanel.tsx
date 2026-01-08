// ShippingPanel.tsx
import React from "react";
import { FleaTransactionDetailResponse } from "../../types/FleaMarket";

export default function ShippingPanel({ data }: { data: FleaTransactionDetailResponse; onChanged: () => void }) {
    const { tx, viewer_role } = data;

    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-2">
            <div className="text-sm font-semibold">発送 / 受取</div>
            <div className="text-xs text-gray-600">
                役割: {viewer_role} / 方法: {tx.shipping_method}
            </div>
            <div className="text-xs text-gray-500">
                追跡番号・発送通知・受取完了ボタンなどをここに足す。
            </div>
        </div>
    );
}
