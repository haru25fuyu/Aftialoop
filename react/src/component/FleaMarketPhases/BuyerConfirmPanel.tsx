// BuyerConfirmPanel.tsx
import React, { useState } from "react";
import api from "../../conf/api";
import { FleaTransactionDetailResponse } from "../../types/FleaMarket";

const cn = (...xs: Array<string | false | undefined | null>) => xs.filter(Boolean).join(" ");

export default function BuyerConfirmPanel({
    data,
    onChanged,
}: {
    data: FleaTransactionDetailResponse;
    onChanged: () => void;
}) {
    const { tx } = data;
    const total = (tx.price_item ?? 0) + (tx.shipping_fee_type === "INCLUDED" ? (tx.price_shipping ?? 0) : 0);

    const [busy, setBusy] = useState(false);

    async function agree() {
        setBusy(true);
        try {
            await api.post(`/flea/transactions/${tx.id}/buyer/confirm`, {});
            onChanged();
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
            <div className="text-sm font-semibold">購入者：条件に同意</div>

            <div className="text-xs text-gray-600">
                配送: {tx.shipping_method} / 送料: {tx.shipping_fee_type}
                {tx.shipping_fee_type === "INCLUDED" ? `（${tx.price_shipping}）` : ""}
            </div>

            <div className="text-sm font-medium">合計（仮）: {total}</div>

            <div className="flex justify-end gap-2">
                <button
                    className={cn("rounded-xl px-4 py-2 text-sm font-medium text-white", busy ? "bg-gray-300" : "bg-black hover:bg-gray-900")}
                    onClick={agree}
                    disabled={busy}
                >
                    {busy ? "処理中…" : "同意して進む"}
                </button>
            </div>
        </div>
    );
}
