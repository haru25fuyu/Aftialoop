// src/modal/ConfirmDialog.tsx
import React, { useMemo, useEffect } from "react";

import { PREFS } from "../conf/config"

type Summary = {
    name: string;
    price: number;
    quantity: number;
    total: number;
    isMultiPurchasable: boolean;
    seller_plus_pct?: number;
    // itemState?: number;
    type: string;
    description: string;
    shippingFeeType: 0 | 1;
    shipFromId: number | null;
    shipsWithinDays?: number; // 空のときは undefined を受ける
    files: File[];        // ← ここをFile[]に
    mainIndex: number;      // プレビューURL（useMemoで生成）
};

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    submitting,
    summary,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    submitting: boolean;
    summary: Summary;
}) {

    const urls = useMemo(() => summary.files.map(f => URL.createObjectURL(f)), [summary.files]);
    useEffect(() => () => { urls.forEach(u => URL.revokeObjectURL(u)); }, [urls]);
    if (!open) return null;

    const {
        name,
        price,
        quantity,
        total,
        isMultiPurchasable,
        // itemState,
        seller_plus_pct,
        type,
        description,
        shippingFeeType,
        shipFromId,
        shipsWithinDays,
        mainIndex,
    } = summary;

    const fmt = (n: number) => n.toLocaleString("ja-JP");

    const typeLabel = type === "ANIMAL" ? "生体" : type === "SUPPLY" ? "用品" : "未選択";
    const shipFeeLabel = shippingFeeType === 0 ? "送料込み（出品者負担）" : "着払い（購入者負担）";
    const shipsLabel =
        shipsWithinDays == null ? "未選択" :
            shipsWithinDays === 1 ? "1日以内" :
                shipsWithinDays === 2 ? "2日以内" :
                    shipsWithinDays === 4 ? "4日以内" :
                        shipsWithinDays === 7 ? "1週間以内" : `${shipsWithinDays}日以内`;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="bg-white w-[92%] max-w-2xl rounded-2xl shadow-xl">
                <div className="px-5 py-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">この内容で出品しますか？</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
                </div>

                <div className="p-5 space-y-4 max-h-[70vh] overflow-auto">
                    {/* 画像サマリ */}
                    <div>
                        <div className="text-sm text-gray-600 mb-2">画像</div>
                        <div className="flex gap-2 flex-wrap">
                            {urls.length === 0 ? (
                                <div className="text-gray-500 text-sm">画像は選択されていません</div>
                            ) : (
                                urls.map((src, i) => (
                                    <div key={i} className={`relative w-20 h-20 rounded-lg overflow-hidden border ${i === mainIndex ? "ring-2 ring-yellow-400" : ""}`}>
                                        <img src={src} className="w-full h-full object-cover" />
                                        {i === mainIndex && (
                                            <span className="absolute bottom-0 left-0 right-0 text-[10px] text-black bg-yellow-300/90 text-center">メイン</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 基本 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Row label="商品名" value={name || "（未入力）"} />
                        <Row label="出品タイプ" value={typeLabel} />
                        <Row label="価格" value={`${fmt(price)} 円`} />
                        <Row label="追加割引" value={`${seller_plus_pct ?? 0} %`} />
                        <Row label="数量" value={`${quantity} 個${isMultiPurchasable ? "（複数購入可）" : ""}`} />
                        <Row label="送料負担" value={shipFeeLabel} />
                        <Row
                            label="発送元"
                            value={PREFS.find(p => p.id === shipFromId)?.name || "（未入力）"}
                        />
                        <Row label="発送までの目安" value={shipsLabel} />
                        <Row label="合計金額" value={`${fmt(total)} 円`} strong />
                    </div>

                    {/* 説明 */}
                    <div>
                        <div className="text-sm text-gray-600 mb-1">商品説明</div>
                        <div className="whitespace-pre-wrap text-sm border rounded-lg p-3">
                            {description || "（未入力）"}
                        </div>
                    </div>
                </div>

                <div className="px-5 py-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 h-10 rounded-xl border bg-white">
                        戻る
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={submitting}
                        className="px-4 h-10 rounded-xl bg-black text-white disabled:opacity-60"
                    >
                        {submitting ? "送信中…" : "出品する"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
    return (
        <div className="text-sm">
            <div className="text-gray-500">{label}</div>
            <div className={strong ? "font-semibold" : ""}>{value}</div>
        </div>
    );
}
