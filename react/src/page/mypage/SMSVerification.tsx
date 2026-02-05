import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Smartphone, Send, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { AxiosError } from "axios";

import { Header } from "../../component/Header";
import api from "../../conf/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../conf/function";

export default function SMSVerification() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth(); // 認証後にユーザー情報を更新するために refreshUser を使う
    const toast = useToast();

    // ステップ管理: 'INPUT_PHONE' | 'INPUT_CODE' | 'COMPLETE'
    const [step, setStep] = useState<"INPUT_PHONE" | "INPUT_CODE" | "COMPLETE">("INPUT_PHONE");

    const [phoneNumber, setPhoneNumber] = useState("");
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    // 1. 認証コード送信 (POST /sms/send)
    const handleSendSMS = async () => {
        if (!phoneNumber) {
            toast({ text: "電話番号を入力してください", kind: "error" });
            return;
        }

        setLoading(true);
        try {
            await api.post("/sms/send", { phone_number: phoneNumber });
            toast({ text: "認証コードを送信しました", kind: "success" });
            setStep("INPUT_CODE");
        } catch (e) {
            const error = e as AxiosError;

            const errorMsg = String(error.response?.data || "");

            if (errorMsg.includes("Phone number already in use"))
                toast({ text: "この電話番号は既に使用されています", kind: "error" });
        } finally {
            setLoading(false);
        }
    };

    // 2. コード検証 (POST /sms/verify)
    const handleVerifySMS = async () => {
        if (!code || code.length < 6) {
            toast({ text: "6桁の認証コードを入力してください", kind: "error" });
            return;
        }
        if (!user?.id) {
            toast({ text: "ログイン情報が見つかりません", kind: "error" });
            return;
        }

        setLoading(true);
        try {
            await api.post("/sms/verify", {
                phone_number: phoneNumber,
                code: code,
                user_id: user.id, // バックエンドが要求している user_id を渡す
            });

            // 成功したらユーザー情報を再取得して最新の状態（電話番号登録済み）にする
            await refreshUser();

            setStep("COMPLETE");
            toast({ text: "本人確認が完了しました！", kind: "success" });
        } catch (e) {
            const error = e as AxiosError;
            const errorMsg = String(error.response?.data || "");

            if (errorMsg.includes("Invalid code or expired")) {
                toast({ text: "認証コードが正しくありません", kind: "error" });
                return;
            }
            // バックエンドのエラーメッセージを表示（例：既に使われている電話番号など）
            toast({ text: errorMsg || "認証に失敗しました", kind: "error" });
        } finally {
            setLoading(false);
        }
    };

    // --- 完了画面 ---
    if (step === "COMPLETE") {
        return (
            <>
                <Header />
                <div className="min-h-screen bg-white p-6 flex flex-col items-center justify-center text-center">
                    <CheckCircle2 size={80} className="text-green-500 mb-6" />
                    <h2 className="text-2xl font-bold mb-3 text-gray-800">電話番号認証 完了</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        電話番号の確認が完了しました。<br />
                        これにより信頼性が向上し、出品などの機能が制限なく利用できます。
                    </p>
                    <button
                        onClick={() => navigate("/mypage")}
                        className="bg-blue-600 text-white font-bold py-3 px-10 rounded-full shadow-lg hover:bg-blue-700 transition"
                    >
                        マイページへ戻る
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="min-h-screen bg-[#f8f9fa] pb-20">
                {/* ナビゲーションバー */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-lg mx-auto h-14 px-4 flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-1 -ml-2 hover:bg-gray-100 rounded-full">
                            <ArrowLeft size={24} className="text-gray-600" />
                        </button>
                        <h1 className="font-bold text-lg">電話番号認証</h1>
                    </div>
                </div>

                <main className="max-w-lg mx-auto p-4 space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex gap-3">
                        <Smartphone className="shrink-0" size={20} />
                        <p>
                            本人確認のため、SMS（ショートメッセージ）を利用して電話番号の認証を行います。
                        </p>
                    </div>

                    <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">

                        {/* ステップ1: 電話番号入力 */}
                        {step === "INPUT_PHONE" && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">携帯電話番号</label>
                                    <input
                                        type="tel"
                                        placeholder="09012345678"
                                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-lg outline-none focus:border-blue-500 transition"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-400 mt-2">※ハイフンなしで入力してください</p>
                                </div>

                                <button
                                    onClick={handleSendSMS}
                                    disabled={loading || !phoneNumber}
                                    className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex justify-center items-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <><Send size={18} /> 認証コードを送信</>}
                                </button>
                            </div>
                        )}

                        {/* ステップ2: 認証コード入力 */}
                        {step === "INPUT_CODE" && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <p className="text-sm text-gray-500 mb-1">認証コードを送信しました</p>
                                    <p className="text-lg font-bold text-gray-800">{phoneNumber}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 text-center">6桁の認証コード</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="123456"
                                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-center text-2xl tracking-[0.5em] font-bold outline-none focus:border-green-500 transition"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={handleVerifySMS}
                                    disabled={loading || code.length < 6}
                                    className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex justify-center items-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "認証して完了する"}
                                </button>

                                <button
                                    onClick={() => setStep("INPUT_PHONE")}
                                    className="w-full text-sm text-gray-500 py-2 hover:underline flex items-center justify-center gap-1"
                                >
                                    <RefreshCw size={14} /> 電話番号を入力し直す
                                </button>
                            </div>
                        )}

                    </section>
                </main>
            </div>
        </>
    );
}