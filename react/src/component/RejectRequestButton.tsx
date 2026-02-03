import React, { useState } from "react";
import api from "../conf/api";
import { XCircle, Loader2, AlertCircle, X } from "lucide-react";

interface Props {
    requestId: number | string;
    onSuccess?: () => void;
    className?: string;
}

export const RejectRequestButton: React.FC<Props> = ({ requestId, onSuccess, className }) => {
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

    const handleReject = async () => {
        // ※理由なしでもOKにするか、必須にするかは運用次第ですが、トラブル防止のため必須推奨
        if (!reason.trim()) {
            alert("却下理由を入力してください");
            return;
        }

        setLoading(true);

        try {
            // バックエンドに /reject エンドポイントが必要になります
            // (Withdrawと同様のロジックでステータスを REJECTED にするAPI)
            await api.post(`/flea/purchase_requests/${requestId}/reject`, {
                reason: reason
            });

            alert("購入申請を却下しました。");
            setIsOpen(false);

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("Reject failed", error);
            alert("操作に失敗しました。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={openModal}
                className={`
                    flex items-center justify-center gap-2 
                    text-red-600 border border-red-200 bg-red-50
                    px-4 py-3 rounded-xl font-bold transition text-sm
                    hover:bg-red-100 hover:border-red-300
                    ${className || ""}
                `}
            >
                <XCircle size={18} />
                この申請を却下する
            </button>

            {/* モーダル */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <AlertCircle size={20} className="text-red-500" />
                                購入申請の却下
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-red-50 p-3 rounded-lg text-sm text-red-700">
                                <p className="font-bold">購入希望をお断りしますか？</p>
                                <p className="mt-1 text-xs">相手に通知が届きます。丁寧な理由を添えることをお勧めします。</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    却下理由 <span className="text-red-500 text-xs">(必須)</span>
                                </label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none transition"
                                    rows={3}
                                    placeholder="例: 他のサイトで売れてしまったため / 条件が合わないため"
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
                                onClick={handleReject}
                                disabled={loading || !reason.trim()}
                                className={`
                                    flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white text-sm transition
                                    ${loading || !reason.trim()
                                        ? "bg-red-300 cursor-not-allowed"
                                        : "bg-red-600 hover:bg-red-700 shadow-md"}
                                `}
                            >
                                {loading && <Loader2 className="animate-spin" size={16} />}
                                却下する
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};