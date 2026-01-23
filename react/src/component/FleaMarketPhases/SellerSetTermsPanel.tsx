// SellerSetTermsPanel.tsx
import React, { useState } from "react";
import api from "../../conf/api";
import { FleaThreadResponse } from "../../types/FleaMarket";

const cn = (...xs: Array<string | false | undefined | null>) => xs.filter(Boolean).join(" ");

export default function SellerSetTermsPanel({
    data,
    onChanged,
}: {
    data: FleaThreadResponse;
    onChanged: () => void;
}) {
    const { transaction } = data;

    const [shippingMethod, setShippingMethod] = useState(transaction?.shipping_method);
    const [shippingFeeType, setShippingFeeType] = useState(transaction?.shipping_fee_type);
    const [priceShipping, setPriceShipping] = useState<number>(transaction?.price_shipping ?? 0);
    const [busy, setBusy] = useState(false);

    async function submit() {
        setBusy(true);
        try {
            // 仮API：出品者が条件確定して buyer_confirm に進める
            await api.post(`/flea/transactions/${transaction?.id}/seller/confirm-terms`, {
                shipping_method: shippingMethod,
                shipping_fee_type: shippingFeeType,
                price_shipping: priceShipping,
            });
            onChanged();
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
            <div>
                <div className="text-sm font-semibold">出品者：条件を確定</div>
                <div className="text-xs text-gray-500 mt-1">
                    配送方法・送料を確定 → 購入者が同意 → 決済へ
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <select
                    className="rounded-xl border px-3 py-2 text-sm"
                    value={shippingMethod}
                    onChange={(e) => setShippingMethod(e.target.value as any)}
                    disabled={busy}
                >
                    <option value="SELLER_CHOICE">おまかせ</option>
                    <option value="MEETUP">手渡し</option>
                    <option value="ANONYMIZED">匿名配送</option>
                </select>

                <select
                    className="rounded-xl border px-3 py-2 text-sm"
                    value={shippingFeeType}
                    onChange={(e) => setShippingFeeType(e.target.value as any)}
                    disabled={busy}
                >
                    <option value="INCLUDED">送料込み</option>
                    <option value="COD">着払い</option>
                </select>

                <input
                    className="rounded-xl border px-3 py-2 text-sm"
                    type="number"
                    value={priceShipping}
                    onChange={(e) => setPriceShipping(Number(e.target.value))}
                    disabled={busy || shippingFeeType === "COD"}
                    placeholder="送料"
                />
            </div>

            <div className="flex justify-end">
                <button
                    className={cn(
                        "rounded-xl px-4 py-2 text-sm font-medium text-white",
                        busy ? "bg-gray-300" : "bg-black hover:bg-gray-900"
                    )}
                    onClick={submit}
                    disabled={busy}
                >
                    {busy ? "送信中…" : "条件を確定して送る"}
                </button>
            </div>
        </div>
    );
}
