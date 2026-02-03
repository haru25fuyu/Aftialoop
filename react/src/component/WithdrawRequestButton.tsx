import React, { useState } from "react";
import api from "../conf/api"; // パスは環境に合わせて調整してください
import { X, Loader2, AlertCircle } from "lucide-react";

interface Props {
    requestId: number | string;
    onSuccess?: () => void;
    className?: string;
}

export const WithdrawRequestButton: React.FC<Props> = ({ requestId, onSuccess, className }) => {
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [reason, setReason] = useState("");

    const openModal = () => {
        setReason("");
        setIsOpen(true);
    };

    const closeModal = () => {
        if (!loading) setIsOpen(false);
    };

    const handleWithdraw = async () => {
        if (!reason.trim()) {
            alert("取り下げ理由を入力してください");
            return;
        }

        setLoading(true);

        try {
            // ボディに reason を含めて送信
            await api.post(`/flea/purchase_requests/${requestId}/withdraw`, {
                reason: reason
            });

            alert("購入申請を取り下げました。");
            setIsOpen(false);

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("Withdraw failed", error);
            alert("申請の取り下げに失敗しました。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={openModal}
                className={`
                    flex items-center justify-center gap-2 
                    text-gray-600 border border-gray-300 bg-white
                    px-4 py-2 rounded-lg font-bold transition text-sm
                    hover:bg-gray-50 hover:text-gray-800
                    ${className || ""}
                `}
            >
                <X size={16} />
                申請を取り下げる
            </button>

            {/* モーダル */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <AlertCircle size={20} className="text-gray-500" />
                                購入申請の取り下げ
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                                <p>申請を取り下げると、出品者に通知が届きます。</p>
                                <p>ペナルティはありませんが、マナーとして理由を添えてください。</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    取り下げ理由 <span className="text-red-500 text-xs">(必須)</span>
                                </label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-gray-200 focus:border-gray-500 outline-none transition"
                                    rows={3}
                                    placeholder="例: 他の商品を購入することになったため / 間違えて申請してしまったため"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={closeModal}
                                disabled={loading}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-bold transition text-sm"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleWithdraw}
                                disabled={loading || !reason.trim()}
                                className={`
                                    flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white text-sm transition
                                    ${loading || !reason.trim()
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-gray-700 hover:bg-gray-800 shadow-md"}
                                `}
                            >
                                {loading && <Loader2 className="animate-spin" size={16} />}
                                申請を取り下げる
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};