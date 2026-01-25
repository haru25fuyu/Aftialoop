import React, { useState } from "react";
import { X, ArrowRight, Loader2, AlertCircle } from "lucide-react"; // アイコン追加

interface Props {
    isOpen: boolean;
    onClose: () => void;
    maxAmount: number; // 現在の残高
    onConfirm: (amount: number) => Promise<void>; // 実行関数
}

const yen = (n: number) => new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(n);

export default function ExchangePointModal({ isOpen, onClose, maxAmount, onConfirm }: Props) {
    const [amountStr, setAmountStr] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ★追加: 確認画面かどうかの状態
    const [step, setStep] = useState<"INPUT" | "CONFIRM">("INPUT");

    if (!isOpen) return null;

    const amount = parseInt(amountStr);
    const isValid = amount > 0 && amount <= maxAmount;

    // 閉じる時のリセット処理
    const handleClose = () => {
        setAmountStr("");
        setStep("INPUT");
        onClose();
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm(amount);
            handleClose();
        } catch (error) {
            console.error(error);
            alert("交換に失敗しました"); // ここは最悪のエラーなのでalertでも許容範囲ですが、トーストがあればそちらへ
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">

                {/* 閉じるボタン */}
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">
                    <X size={24} />
                </button>

                <h2 className="text-xl font-bold text-gray-800 mb-2">ポイント交換</h2>

                {/* --- 入力画面 (STEP 1) --- */}
                {step === "INPUT" && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                        <p className="text-sm text-gray-500 mb-4">
                            売上金残高をポイントにチャージします。<br />手数料はかかりません。
                        </p>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-gray-500">交換額 (¥)</label>
                                <span className="text-xs text-blue-600 font-bold">残高: {yen(maxAmount)}</span>
                            </div>
                            <input
                                type="number"
                                value={amountStr}
                                onChange={(e) => setAmountStr(e.target.value)}
                                placeholder="1000"
                                autoFocus
                                className="w-full text-2xl font-bold p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* プレビュー */}
                        {amount > 0 && (
                            <div className={`p-3 rounded-lg flex items-center justify-center gap-3 font-bold ${amount > maxAmount ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"}`}>
                                {amount > maxAmount ? (
                                    <span className="text-sm">残高不足です</span>
                                ) : (
                                    <>
                                        <span>{yen(amount)}</span>
                                        <ArrowRight size={18} />
                                        <span>{amount} pt</span>
                                    </>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => setStep("CONFIRM")}
                            disabled={!isValid}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            確認へ進む
                        </button>
                    </div>
                )}

                {/* --- 確認画面 (STEP 2) --- */}
                {step === "CONFIRM" && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-200 text-center pt-2">
                        <div className="flex justify-center text-blue-600 mb-2">
                            <AlertCircle size={48} />
                        </div>

                        <div>
                            <p className="text-sm text-gray-500 mb-2">以下の内容で交換します。<br />よろしいですか？</p>
                            <div className="text-2xl font-bold text-gray-800">
                                {yen(amount)} <span className="text-sm text-gray-400">→</span> {amount} pt
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep("INPUT")}
                                disabled={isSubmitting}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold transition"
                            >
                                戻る
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2"
                            >
                                {isSubmitting && <Loader2 className="animate-spin" size={18} />}
                                {isSubmitting ? "処理中..." : "交換確定"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}