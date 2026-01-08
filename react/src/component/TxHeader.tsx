import React from "react";
import { FleaTransactionDetailResponse } from "../types/FleaMarket";
import { TxPhase } from "../conf/FleaMarket";

const cn = (...xs: Array<string | false | undefined | null>) => xs.filter(Boolean).join(" ");

export default function TxHeader({
    data,
    phase,
}: {
    data: FleaTransactionDetailResponse;
    phase: TxPhase;
}) {
    const { tx, item, counterparty, viewer_role } = data;

    const title = item?.name ?? `取引 #${tx.id}`;
    const sub = viewer_role === "BUYER" ? "出品者" : "購入者";

    return (
        <div className="rounded-2xl border bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                    {item?.main_image_url ? (
                        <img src={item.main_image_url} className="h-full w-full object-cover" />
                    ) : null}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-base font-semibold truncate">{title}</div>
                        <StatusBadge phase={phase} />
                    </div>

                    <div className="mt-1 text-xs text-gray-600">
                        {sub}: {counterparty?.name ?? "(取得中)"}
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                        小計: {tx.price_item} / 送料: {tx.price_shipping} / 決済: {tx.payment_status}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ phase }: { phase: TxPhase }) {
    const label: Record<TxPhase, string> = {
        SELLER_SET_TERMS: "条件確定（出品者）",
        BUYER_WAIT_TERMS: "条件待ち（購入者）",
        BUYER_CONFIRM: "購入者の同意待ち",
        PAYMENT: "決済",
        SHIPPING: "発送/受取",
        COMPLETE: "完了",
        CANCELLED: "キャンセル",
        UNKNOWN: "不明",
    };

    return (
        <span className={cn("rounded-full border px-3 py-1 text-xs", "bg-gray-50")}>
            {label[phase]}
        </span>
    );
}
