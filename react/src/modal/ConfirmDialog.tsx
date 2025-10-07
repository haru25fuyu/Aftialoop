import React, { useEffect } from "react";



export function ConfirmDialog({ open, onClose, onConfirm, submitting, summary, }: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    submitting: boolean;
    summary: {
        name: string;
        price: number;
        quantity: number;
        total: number;
        isMultiPurchasable: boolean;
        itemState: number;
        categoryId: string;
        description: string;
        shippingFeeType: 0 | 1;
        shipFrom: string;
        shipsWithinDays?: number;
        mainIndex: number;
        previews: string[];
    };
}) {

    useEffect(() => {
        if (!open) return;
        const scrollY = window.scrollY;
        const prev = {
            position: document.body.style.position,
            top: document.body.style.top,
            left: document.body.style.left,
            right: document.body.style.right,
            width: document.body.style.width,
        };
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
        return () => {
            document.body.style.position = prev.position;
            document.body.style.top = prev.top;
            document.body.style.left = prev.left;
            document.body.style.right = prev.right;
            document.body.style.width = prev.width;
            window.scrollTo(0, scrollY);
        };
    }, [open]);

    if (!open) return null;

    const stateLabel = ["未指定", "新品", "未使用に近い", "目立った傷や汚れなし", "やや傷や汚れあり", "傷や汚れあり"][summary.itemState] ?? "未指定";
    const feeLabel = summary.shippingFeeType === 0 ? "送料込み（出品者負担）" : "着払い（購入者負担）";

    // 背景スクロール抑止（簡易）


    return (
        <div
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
            aria-modal="true" role="dialog"
        >
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full md:max-w-2xl bg-white rounded-t-2xl md:rounded-2xl shadow-lg p-4 md:p-6 max-h-[90vh] overflow-auto">
                <h3 className="text-lg font-semibold mb-4">この内容で出品しますか？</h3>

                {/* 画像スライド（横スクロール） */}
                {summary.previews.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                        {summary.previews.map((src, i) => (
                            <div key={i} className={`relative w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden border ${i === summary.mainIndex ? "ring-2 ring-yellow-400" : ""}`}>
                                <img src={src} alt={`preview-${i}`} className="object-cover w-full h-full" />
                                {i === summary.mainIndex && (
                                    <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-400 text-black">メイン</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="space-y-2 text-sm">
                    <KV k="商品名" v={summary.name} />
                    <KV k="価格" v={`${summary.price.toLocaleString()} 円`} />
                    <KV k="数量" v={`${summary.quantity} 点`} />
                    <KV k="小計" v={`${summary.total.toLocaleString()} 円`} strong />
                    <KV k="複数購入" v={summary.isMultiPurchasable ? "許可する" : "許可しない"} />
                    <KV k="状態" v={stateLabel} />
                    {summary.categoryId && <KV k="カテゴリ" v={summary.categoryId} />}
                    <KV k="送料" v={feeLabel} />
                    <KV k="発送元" v={summary.shipFrom} />
                    {summary.shipsWithinDays !== undefined && <KV k="発送目安" v={`${summary.shipsWithinDays}日以内`} />}
                    <div>
                        <div className="text-gray-500 mb-1">商品説明</div>
                        <div className="whitespace-pre-wrap bg-gray-50 rounded-xl p-3 border">{summary.description}</div>
                    </div>
                </div>

                <div className="mt-5 flex gap-2">
                    <button
                        className="flex-1 h-11 rounded-xl border bg-white"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        修正する
                    </button>
                    <button
                        className="flex-1 h-11 rounded-xl bg-black text-white disabled:opacity-60"
                        onClick={onConfirm}
                        disabled={submitting}
                    >
                        {submitting ? "送信中…" : "この内容で出品する"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function KV({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="text-gray-500">{k}</div>
            <div className={`text-right ${strong ? "font-semibold" : ""}`}>{v}</div>
        </div>
    );
}
