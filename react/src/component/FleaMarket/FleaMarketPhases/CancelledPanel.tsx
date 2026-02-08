import { FleaThreadResponse } from "../../types/FleaMarket";
import { AlertCircle, Info, RefreshCw, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CancelledPanel({ data }: { data: FleaThreadResponse }) {
    const navigate = useNavigate();
    const { transaction, role} = data;
    console.log(transaction)

    // トランザクション情報がない場合は何も表示しない（念の為）
    if (!transaction) return null;

    const isSeller = role === "SELLER";
    const reason = transaction.cancellation_reason || "理由の記載はありません";

    return (
        <div className="rounded-2xl border border-red-200 bg-white shadow-sm overflow-hidden">
            {/* ヘッダー部分 */}
            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-3">
                <AlertCircle className="text-red-600" size={24} />
                <div>
                    <h2 className="font-bold text-red-800 text-lg">この取引はキャンセルされました</h2>
                    <p className="text-xs text-red-600 opacity-80">
                        キャンセル日時: {new Date(transaction.updated_at).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* 1. キャンセル理由の表示 */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-2">
                        <FileText size={16} /> キャンセル理由
                    </h3>
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {reason}
                    </p>
                </div>

                {/* 2. 今後の案内 (Roleによって出し分け) */}
                <div className="flex flex-col gap-4">
                    {isSeller ? (
                        // --- 出品者向けの案内 ---
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                            <div className="font-bold mb-1 flex items-center gap-2">
                                <Info size={18} /> 商品の状態について
                            </div>
                            <p className="mb-3">
                                商品は現在<b>「下書き（非公開）」</b>に戻っています。
                                他のユーザーからは見えなくなっています。
                            </p>
                            <p>
                                販売を再開する場合は、商品編集ページから内容を確認し、
                                再度「出品する」ボタンを押してください。
                            </p>

                            {/* 再出品ボタン */}
                            <button
                                onClick={() => navigate(`/flea-market/item/edit/${transaction.item_id}`)}
                                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-sm"
                            >
                                <RefreshCw size={18} />
                                商品を編集して再出品する
                            </button>
                        </div>
                    ) : (
                        // --- 購入者向けの案内 ---
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-sm text-green-800">
                            <div className="font-bold mb-1 flex items-center gap-2">
                                <Info size={18} /> 返金について
                            </div>
                            <p>
                                お支払い済みの代金がある場合、システムの規定に基づき返金処理が行われます。
                            </p>
                            <p className="mt-2 text-xs opacity-80">
                                ※クレジットカード等の場合、カード会社への反映に数日かかることがあります。<br />
                                ※ポイント利用分はポイント残高に戻ります。
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}