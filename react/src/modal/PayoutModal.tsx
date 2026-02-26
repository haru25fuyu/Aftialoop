import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowRight, Building2, AlertCircle, Loader2, ShieldAlert } from "lucide-react";
import { AxiosError } from "axios";

import api from "../conf/api";
import { useToast } from "../conf/function";
import { LoadingButton } from "../component/LoadingButton";

// 親から受け取るデータ
interface PayoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void; // 申請成功時に親側でリロードなどをさせる
    currentBalance: number; // 現在の売上残高
}

// 銀行情報の型
interface BankAccount {
    bank_name: string;
    branch_name: string;
    account_type: number;
    account_number: string;
}

// 設定値（本来はAPIから取るのがベストですが、一旦定数定義）
const TRANSFER_FEE = 200;
const MIN_AMOUNT = 201;

export default function PayoutModal({ isOpen, onClose, onSuccess, currentBalance }: PayoutModalProps) {
    const navigate = useNavigate();
    const toast = useToast();

    const [amount, setAmount] = useState<string>("");
    const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
    const [loadingBank, setLoadingBank] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [view, setView] = useState<"form" | "verify_required">("form");

    // モーダルが開いた時に銀行口座情報を取得しにいく
    useEffect(() => {
        if (isOpen) {
            fetchBankAccount();
            setAmount(""); // 入力リセット
            setView("form");
        }
    }, [isOpen]);

    const fetchBankAccount = async () => {
        setLoadingBank(true);
        try {
            const res = await api.get("/user/bank-account");
            setBankAccount(res.data);
        } catch (e) {
            const error = e as AxiosError;
            // 404なら口座未登録（nullのまま）
            if (error.response?.status !== 404) {
                console.error(e);
            }
        } finally {
            setLoadingBank(false);
        }
    };

    const handleSubmit = async () => {
        if (!amount || submitting) return;

        const numAmount = parseInt(amount, 10);
        if (isNaN(numAmount) || numAmount < MIN_AMOUNT) return;

        setSubmitting(true);
        try {
            // バックエンドへ送信
            await api.post("/flea-market/payout", { amount: numAmount });
            toast({ text: "振込申請が完了しました", kind: "success" });
            onSuccess(); // 親コンポーネントに通知
            onClose();   // 閉じる
        } catch (e) {
            const error = e as AxiosError;
            console.error(e);
            // エラーメッセージの出し分け
            const errorMsg = String(error.response?.data || "");

            if (errorMsg.includes("identity_verification_required")) {
                setView("verify_required");
                toast({ text: "本人確認が必要です", kind: "error" });
            } else if (error.response?.data === "insufficient balance") {
                toast({ text: "残高が不足しています", kind: "error" });
            } else {
                toast({ text: "申請に失敗しました", kind: "error" });
            }
        } finally {
            setSubmitting(false);
        }
    };

    // 計算ロジック
    const inputAmount = parseInt(amount || "0", 10);
    const transferAmount = inputAmount - TRANSFER_FEE;
    const isBalanceEnough = inputAmount <= currentBalance;
    const isAmountEnough = inputAmount >= MIN_AMOUNT;
    const canSubmit = bankAccount && inputAmount > 0 && isBalanceEnough && isAmountEnough && !submitting;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">

                {/* ヘッダー */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-lg text-gray-800">振込申請</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-5 space-y-6">
                    {/* ==================================================== */}
                    {/* ★ パターンA: 本人確認誘導画面 (エラー時に表示) */}
                    {/* ==================================================== */}
                    {view === "verify_required" ? (
                        <div className="text-center py-4 space-y-5 animate-in slide-in-from-right duration-300">
                            <div className="bg-orange-50 text-orange-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                                <ShieldAlert size={40} />
                            </div>

                            <div>
                                <h3 className="font-bold text-xl text-gray-800 mb-2">本人確認を行ってください</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    安全な取引のため、売上金の振込申請には<br />
                                    本人確認書類の提出が必要です。
                                </p>
                            </div>

                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={() => navigate("/mypage/settings/identity")} // 設定画面へ
                                    className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-orange-600 transition-colors"
                                >
                                    本人確認へ進む
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full text-gray-500 font-bold py-3 text-sm hover:underline"
                                >
                                    あとで
                                </button>
                            </div>
                        </div>
                    ) : (
                        // ====================================================
                        // ★ パターンB: 通常の申請フォーム (既存コード)
                        // ====================================================
                        <div className="space-y-6">
                            {loadingBank ? (
                                <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
                            ) : !bankAccount ? (
                                // ★ 口座未登録の場合
                                <div className="text-center py-6 space-y-4">
                                    <div className="bg-red-50 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <Building2 size={32} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">口座が登録されていません</h3>
                                        <p className="text-sm text-gray-500 mt-1">売上金を受け取るには口座登録が必要です。</p>
                                    </div>
                                    <button
                                        onClick={() => navigate("/mypage/bank-account")}
                                        className="bg-blue-600 text-white font-bold px-6 py-3 rounded-full hover:bg-blue-700 transition-colors w-full"
                                    >
                                        口座を設定する
                                    </button>
                                </div>
                            ) : (
                                // ★ 口座あり・申請フォーム
                                <>
                                    {/* 残高表示 */}
                                    <div className="bg-blue-50 p-4 rounded-xl flex justify-between items-center text-blue-900">
                                        <span className="text-sm font-bold">振込可能残高</span>
                                        <span className="text-lg font-bold">¥ {currentBalance.toLocaleString()}</span>
                                    </div>

                                    {/* 金額入力 */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">申請金額</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                                            <input
                                                type="number"
                                                className={`w-full pl-8 pr-4 py-3 text-xl font-bold rounded-xl border-2 focus:ring-0 outline-none transition-colors ${!isBalanceEnough ? "border-red-300 bg-red-50 text-red-600" : "border-gray-200 focus:border-blue-500"
                                                    }`}
                                                placeholder="0"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                            />
                                        </div>
                                        {/* エラー・注釈表示 */}
                                        <div className="mt-2 text-xs">
                                            {!isBalanceEnough && <p className="text-red-500 font-bold flex items-center gap-1"><AlertCircle size={12} /> 残高を超えています</p>}
                                            {isBalanceEnough && inputAmount > 0 && inputAmount < MIN_AMOUNT && (
                                                <p className="text-red-500">※{MIN_AMOUNT}円以上から申請可能です</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* 計算結果 */}
                                    {inputAmount >= MIN_AMOUNT && isBalanceEnough && (
                                        <div className="space-y-3 py-3 border-t border-dashed border-gray-200">
                                            <div className="flex justify-between text-sm text-gray-500">
                                                <span>申請金額</span>
                                                <span>¥ {inputAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-gray-500">
                                                <span>手数料</span>
                                                <span className="text-red-500">- ¥ {TRANSFER_FEE}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <span className="font-bold text-gray-800">振込予定額</span>
                                                <span className="text-xl font-bold text-blue-600">
                                                    ¥ {Math.max(0, transferAmount).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* 振込先確認 */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <p className="text-xs font-bold text-gray-400 mb-2">振込先口座</p>
                                        <div className="flex items-start gap-3">
                                            <Building2 className="text-gray-400 mt-1" size={18} />
                                            <div>
                                                <p className="font-bold text-sm text-gray-800">{bankAccount.bank_name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {bankAccount.branch_name} / {bankAccount.account_type === 1 ? "普通" : "当座"} / ****{bankAccount.account_number.slice(-3)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => navigate("/mypage/bank-account")}
                                                className="ml-auto text-xs font-bold text-blue-600 hover:underline"
                                            >
                                                変更
                                            </button>
                                        </div>
                                    </div>

                                    {/* 送信ボタン */}
                                    <LoadingButton
                                        onClick={handleSubmit}
                                        disabled={!canSubmit}
                                        loading={submitting} // ★これで連打防止＆くるくる
                                        className="w-full bg-red-500 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-red-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2"
                                    >
                                        申請を確定する <ArrowRight size={18} />
                                    </LoadingButton>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}