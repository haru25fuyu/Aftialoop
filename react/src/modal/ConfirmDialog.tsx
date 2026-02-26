import React, { useMemo, useEffect } from "react";
import { CONFIG, PREFS } from "../conf/config";
import { PublishSummary, LiveDetails, SupplyDetails } from "../types/FleaMarketForm";
import { TYPE_LABELS } from "../conf/Market";
import { LoadingButton } from "../component/LoadingButton";

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
    summary: PublishSummary;
}) {
    const displayUrls = useMemo(() => {
        return summary.images.map(img => {
            if (img.file) return { src: URL.createObjectURL(img.file), isBlob: true };
            return { src: img.url, isBlob: false };
        });
    }, [summary.images]);

    useEffect(() => {
        return () => {
            displayUrls.forEach(d => { if (d.isBlob) URL.revokeObjectURL(d.src); });
        };
    }, [displayUrls]);

    if (!open) return null;

    const {
        name, price, quantity, total, isMultiPurchasable, seller_plus_pct,
        type, description, shippingFeeType, shipFromId, shipsWithinDays, mainIndex,
        details,
        category_name,
    } = summary;

    const fmt = (n: number) => n.toLocaleString("ja-JP");

    const typeLabel = TYPE_LABELS[type] || "その他";

    const isSupply = type === "SUPPLY";
    const isLivingThing = !isSupply;

    const shipFeeLabel = shippingFeeType === 0 ? "送料込み (出品者負担)" : "着払い (購入者負担)";
    const shipsLabel = shipsWithinDays == null ? "未選択" :
        shipsWithinDays === 1 ? "1日以内" :
            shipsWithinDays === 2 ? "2〜3日" :
                shipsWithinDays === 4 ? "4〜7日" : `${shipsWithinDays}日以内`;

    const getSexLabel = (sex: string) => {
        switch (sex) {
            case "male": return "オス";
            case "female": return "メス";
            case "pair": return "ペア";
            default: return "不明";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">

                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <h3 className="text-xl font-bold text-gray-800">出品内容の確認</h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                    {/* 画像 */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">商品画像</h4>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {summary.images.length === 0 ? (
                                <div className="w-full h-32 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm">画像なし</div>
                            ) : (
                                summary.images.map((img, i) => (
                                    <div key={i} className={`relative shrink-0 w-24 h-24 rounded-lg overflow-hidden border bg-gray-50 ${i === mainIndex ? "ring-2 ring-offset-2 ring-blue-600 border-transparent" : "border-gray-200"}`}>
                                        <img src={img.file ? URL.createObjectURL(img.file) : CONFIG.BASE_URL + img.url} className="w-full h-full object-cover" alt={`preview-${i}`} />
                                        {i === mainIndex && <div className="absolute inset-x-0 bottom-0 bg-blue-600/90 py-0.5"><p className="text-[10px] font-bold text-white text-center leading-none">メイン</p></div>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 基本情報 */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">基本情報</h4>
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <Row label="商品名" value={name} isLarge />
                                <Row label="カテゴリー" value={category_name} />

                                {/* ★修正: マッピングされた詳細なラベルを表示 */}
                                <Row
                                    label="出品カテゴリー"
                                    value={
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isLivingThing ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                                            }`}>
                                            {typeLabel}
                                        </span>
                                    }
                                />

                                <div className="col-span-1 md:col-span-2 my-2 border-t border-gray-200" />
                                <Row label="販売価格" value={`¥ ${fmt(price)}`} isMoney />
                                <Row label="数量" value={`${quantity} 個 ${isMultiPurchasable ? "(複数可)" : ""}`} />
                                <Row label="追加割引" value={seller_plus_pct ? `${seller_plus_pct}%` : "なし"} />
                                <Row label="合計金額 (概算)" value={`¥ ${fmt(total)}`} isMoney isTotal />
                            </div>
                        </div>
                    </div>

                    {/* 詳細スペック */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">詳細スペック ({typeLabel})</h4>
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            {/* 用品以外（昆虫、爬虫類、植物など）は共通の詳細フォーマットを表示 */}
                            {isLivingThing ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <Row label="産地" value={(details as LiveDetails).locality} />
                                    {/* 植物などの場合、羽化日や性別が空なら「-」が表示されます */}
                                    <Row label="羽化日/採取日" value={(details as LiveDetails).hatch_date} />
                                    <Row label="サイズ" value={(details as LiveDetails).size} />
                                    <Row label="累代" value={(details as LiveDetails).generation} />
                                    <Row label="性別" value={getSexLabel((details as LiveDetails).sex)} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <Row label="ブランド" value={(details as SupplyDetails).brand} />
                                    <Row label="SKU / 型番" value={(details as SupplyDetails).sku} />
                                    <Row label="内容量" value={(details as SupplyDetails).net_weight_g ? `${(details as SupplyDetails).net_weight_g} g` : ""} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 配送について */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">配送について</h4>
                        <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Row label="配送料の負担" value={shipFeeLabel} />
                            <Row label="発送元の地域" value={PREFS.find(p => p.id === shipFromId)?.name || "未選択"} />
                            <Row label="発送までの日数" value={shipsLabel} />
                        </div>
                    </div>

                    {/* 説明 */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">商品説明</h4>
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[100px]">
                            {description || <span className="text-gray-400 italic">商品説明はありません</span>}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">修正する</button>
                    <LoadingButton
                        onClick={onConfirm}
                        loading={submitting}
                        className="w-full sm:w-auto px-8 py-2.5 rounded-lg bg-red-600 text-white font-bold shadow-sm hover:bg-red-700 transition-all disabled:bg-red-400"
                    >
                        規約に同意して出品する
                    </LoadingButton>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value, isLarge, isMoney, isTotal }: { label: string; value: React.ReactNode; isLarge?: boolean; isMoney?: boolean; isTotal?: boolean; }) {
    return (
        <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium text-gray-500">{label}</dt>
            <dd className={`text-gray-900 break-words ${isLarge ? "text-lg font-bold" : "text-sm"} ${isMoney ? "font-mono tracking-tight" : ""} ${isTotal ? "text-xl text-red-600 font-bold" : ""}`}>{value || "—"}</dd>
        </div>
    );
}