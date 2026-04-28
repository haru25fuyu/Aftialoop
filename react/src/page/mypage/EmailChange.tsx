import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Send, CheckCircle2, Loader2 } from "lucide-react";

import { Header } from "../../component/Header";
import api from "../../conf/api";
import { useToast } from "../../conf/function";
import { useAuth } from "../../context/AuthContext";
import { AxiosError } from "axios";

export default function EmailChange() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshUser } = useAuth(); // 更新後にユーザー情報を再取得

  const [step, setStep] = useState<"INPUT" | "VERIFY" | "COMPLETE">("INPUT");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. 変更リクエスト
  const handleRequest = async () => {
    if (!newEmail.includes("@")) {
      toast({ text: "正しいメールアドレスを入力してください", kind: "error" });
      return;
    }
    setLoading(true);
    try {
      await api.post("/settings/email/request", { new_email: newEmail });
      toast({ text: "認証コードを送信しました", kind: "success" });
      setStep("VERIFY");
    } catch (e) {
      const error = e as AxiosError;
      const errorMsg = String(error.response?.data || "");

      toast({ text: errorMsg || "送信失敗", kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 2. 検証 & 変更完了
  const handleVerify = async () => {
    if (code.length < 6) {
      toast({ text: "6桁のコードを入力してください", kind: "error" });
      return;
    }
    setLoading(true);
    try {
      await api.post("/settings/email/verify", { code });

      // 成功したらユーザー情報を更新
      await refreshUser();

      setStep("COMPLETE");
      toast({ text: "メールアドレスを変更しました", kind: "success" });
    } catch (e) {
      const error = e as AxiosError;
      const errorMsg = String(error.response?.data || "");

      toast({ text: errorMsg || "認証失敗", kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (step === "COMPLETE") {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-white p-6 flex flex-col items-center justify-center text-center">
          <CheckCircle2 size={80} className="text-green-500 mb-6" />
          <h2 className="text-2xl font-bold mb-3">変更完了</h2>
          <p className="text-gray-600 mb-8">
            メールアドレスの変更が完了しました。
            <br />
            次回から新しいメールアドレスでログインしてください。
          </p>
          <button
            onClick={() => navigate("/mypage")}
            className="bg-blue-600 text-white font-bold py-3 px-10 rounded-full"
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
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-lg mx-auto h-14 px-4 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <h1 className="font-bold text-lg">メールアドレス変更</h1>
          </div>
        </div>

        <main className="max-w-lg mx-auto p-4 space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex gap-3">
            <Mail className="shrink-0" size={20} />
            <p>新しいメールアドレス宛に確認コードを送信します。</p>
          </div>

          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            {step === "INPUT" && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    新しいメールアドレス
                  </label>
                  <input
                    type="email"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 outline-none focus:border-blue-500"
                    placeholder="example@animaloop.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleRequest}
                  disabled={loading || !newEmail}
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <Send size={18} /> 認証コードを送る
                    </>
                  )}
                </button>
              </>
            )}

            {step === "VERIFY" && (
              <>
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-500">送信先: {newEmail}</p>
                  <p className="text-xs text-gray-400">
                    届かない場合は迷惑メールフォルダを確認してください
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 text-center">
                    認証コード
                  </label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-center text-2xl tracking-[0.5em] font-bold"
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleVerify}
                  disabled={loading || code.length < 6}
                  className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "変更を確定する"
                  )}
                </button>
              </>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
