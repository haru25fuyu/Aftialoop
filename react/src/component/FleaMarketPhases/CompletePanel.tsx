import React from "react";
import { FleaThreadResponse } from "../../types/FleaMarket"; // 型定義は適宜合わせてください
import { CheckCircle, FileText, HelpCircle, Home, Calendar, Hash } from "lucide-react";
import { CONFIG } from "../../conf/config";

// 日付フォーマット
function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString("ja-JP", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
    });
}

function yen(n: number) {
    return n.toLocaleString();
}

export default function CompletePanel({ 
    data, 
    onChanged 
}: { 
    data: FleaThreadResponse; 
    onChanged: () => void 
}) {
    const { transaction: tx, item, role } = data;

    if (!tx || tx.status !== "COMPLETED") return null;

    // 領収書発行（モック）
    const handleReceipt = () => {
        alert("領収書表示機能はまだ未実装です。\n(PDF生成や印刷プレビューなどをここに繋ぎます)");
    };

    return (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* 完了ヘッダー */}
            <div className="bg-gray-50 p-8 text-center border-b border-gray-100">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4 animate-in zoom-in duration-300">
                    <CheckCircle className="text-green-600 w-8 h-8" strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">取引完了</h2>
                <p className="text-gray-500 mt-2 text-sm">
                    すべての手続きが完了しました。<br />
                    ご利用ありがとうございました。
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* 取引情報カード */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
                        Transaction Summary
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                                {item.main_image_url ? (
                                    <img 
                                        src={CONFIG.BASE_URL + item.main_image_url} 
                                        alt={item.name} 
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400">No Img</div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-gray-900 truncate">{item.name}</div>
                                <div className="text-sm text-gray-500">{yen(tx.price_item)}円</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <Calendar size={14} className="text-gray-400" />
                                <span className="text-xs text-gray-500">完了日:</span>
                                <span className="font-medium text-gray-900">{formatDate(tx.completed_at)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <Hash size={14} className="text-gray-400" />
                                <span className="text-xs text-gray-500">取引ID:</span>
                                <span className="font-mono font-medium text-gray-900">{tx.id}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* アクションボタン群 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 領収書 (購入者のみ表示など条件分岐してもOK) */}
                    <button
                        onClick={handleReceipt}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
                    >
                        <FileText size={18} />
                        取引明細 / 領収書
                    </button>

                    {/* お問い合わせ */}
                    <a
                        href="/contact" // 適切なパスへ
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
                    >
                        <HelpCircle size={18} />
                        この取引について問い合わせる
                    </a>
                </div>

                {/* トップへ戻る */}
                <a
                    href="/flea-market"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-black text-white font-bold text-base hover:bg-gray-800 transition-all shadow-md hover:shadow-lg"
                >
                    <Home size={20} />
                    フリーマーケットトップへ
                </a>
            </div>
        </div>
    );
}