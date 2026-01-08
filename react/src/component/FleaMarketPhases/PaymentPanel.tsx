// PaymentPanel.tsx
import React, { useState } from "react";
import api from "../../conf/api";
import { FleaTransactionDetailResponse } from "../../types/FleaMarket";

const cn = (...xs: Array<string | false | undefined | null>) => xs.filter(Boolean).join(" ");

export default function PaymentPanel({
    data,
    onChanged,
}: {
    data: FleaTransactionDetailResponse;
    onChanged: () => void;
}) {
    const { tx } = data;
    const [busy, setBusy] = useState(false);

    async function payMock() {
        setBusy(true);
        try {
            // 仮：Squareに繋ぐ前のモック
            await api.post(`/flea/transactions/${tx.id}/pay/mock`, {});
            onChanged();
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
            <div className="text-sm font-semibold">決済</div>
            <div className="text-xs text-gray-500">
                ここは後で Square 決済コンポーネントに差し替え。
            </div>

            <div className="flex justify-end">
                <button
                    className={cn("rounded-xl px-4 py-2 text-sm font-medium text-white", busy ? "bg-gray-300" : "bg-black hover:bg-gray-900")}
                    onClick={payMock}
                    disabled={busy}
                >
                    {busy ? "処理中…" : "（仮）支払う"}
                </button>
            </div>
        </div>
    );
}
