import React, { useState } from "react";
import api from "../conf/api";
import { XCircle, Loader2, AlertTriangle, X } from "lucide-react";

interface Props {
    transactionId: number | string;
    onSuccess?: () => void;
    className?: string;
}

export const CancelTransactionButton: React.FC<Props> = ({ transactionId, onSuccess, className }) => {
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false); // モーダルの開閉
    const [reason, setReason] = useState("");    // キャンセル理由

    // モーダルを開く
    const openModal = () => {
        setReason(""); // リセット
        setIsOpen(true);
    };

    // モーダルを閉じる
    const closeModal = () => {
        if (!loading) setIsOpen(false);
    };

    const handleCancel = async () => {
        if (!reason.trim()) {
            alert("キャンセル理由を入力してください");
            return;
        }

        setLoading(true);

        try {
            // キャンセル理由をボディに含めて送信
            await api.post(`/flea-market/transactions/${transactionId}/cancel`, {
                reason: reason
            });

            alert("取引をキャンセルしました。");
            setIsOpen(false);

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("Cancel failed", error);
            const msg = "キャンセルに失敗しました。時間をおいて再度お試しください。";
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* トリガーボタン */}
            <button
                onClick={openModal}
                className={`
                    flex items-center justify-center gap-2 
                    bg-red-50 text-red-600 border border-red-200 
                    px-4 py-2 rounded-lg font-bold transition
                    hover:bg-red-100 hover:border-red-300
                    ${className || ""}
                `}
            >
                <XCircle size={18} />
                取引をキャンセル
            </button>

            {/* モーダル本体 */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                        {/* ヘッダー */}
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <AlertTriangle className="text-red-500" size={20} />
                                取引のキャンセル
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        {/* ボディ */}
                        <div className="p-6 space-y-4">
                            <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-sm text-red-700">
                                <p className="font-bold mb-1">ご注意ください</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                    <li>返金処理が行われます</li>
                                    <li>商品は「出品中」に戻ります</li>
                                    <li>この操作は取り消せません</li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    キャンセル理由 <span className="text-red-500 text-xs">(必須)</span>
                                </label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none transition"
                                    rows={4}
                                    placeholder="例: 商品に不備が見つかったため / 購入者と連絡がつかないため 等"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* フッター */}
                        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={closeModal}
                                disabled={loading}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-bold transition text-sm"
                            >
                                閉じる
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={loading || !reason.trim()}
                                className={`
                                    flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white text-sm transition
                                    ${loading || !reason.trim()
                                        ? "bg-red-300 cursor-not-allowed"
                                        : "bg-red-600 hover:bg-red-700 shadow-md"}
                                `}
                            >
                                {loading && <Loader2 className="animate-spin" size={16} />}
                                キャンセル確定
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};