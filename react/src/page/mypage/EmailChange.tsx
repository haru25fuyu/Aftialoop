import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { AxiosError } from "axios";
import { Header } from "../../component/Header";
import api from "../../conf/api";
import { useToast } from "../../conf/function";
import { useAuth } from "../../context/AuthContext";
import { s } from "../../styles/page/mypage/EmailChange.styles";

export default function EmailChange() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<"INPUT" | "VERIFY" | "COMPLETE">("INPUT");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    if (!newEmail.includes("@")) { toast({ text: "正しいメールアドレスを入力してください", kind: "error" }); return; }
    setLoading(true);
    try { await api.post("/settings/email/request", { new_email: newEmail }); toast({ text: "認証コードを送信しました", kind: "success" }); setStep("VERIFY"); }
    catch (e) { const err = e as AxiosError; toast({ text: String(err.response?.data || "送信失敗"), kind: "error" }); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (code.length < 6) { toast({ text: "6桁のコードを入力してください", kind: "error" }); return; }
    setLoading(true);
    try { await api.post("/settings/email/verify", { code }); await refreshUser(); setStep("COMPLETE"); toast({ text: "メールアドレスを変更しました", kind: "success" }); }
    catch (e) { const err = e as AxiosError; toast({ text: String(err.response?.data || "認証失敗"), kind: "error" }); }
    finally { setLoading(false); }
  };

  if (step === "COMPLETE") return (
    <>
      <Header />
      <div style={{ minHeight: "100vh", backgroundColor: "#fff", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <CheckCircle2 size={80} style={{ color: "#3a7a22", marginBottom: 24 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>変更完了</h2>
        <p style={{ color: "#5c5a56", marginBottom: 32 }}>メールアドレスの変更が完了しました。</p>
        <button onClick={() => navigate("/mypage/settings")} style={s.submitBtn}>設定に戻る</button>
      </div>
    </>
  );

  return (
    <>
      <Header />
      <div style={s.page}>
        <div style={s.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer" }}><ArrowLeft size={20} /></button>
            <h2 style={s.title}>メールアドレス変更</h2>
          </div>
          {step === "INPUT" && (
            <div>
              <div style={{ marginBottom: 24, backgroundColor: "#f0f4fe", border: "1px solid #93b3f5", padding: 16, borderRadius: 8, fontSize: 14, color: "#1a3c8c" }}>
                <Mail size={16} style={{ display: "inline", marginRight: 8 }} />新しいメールアドレスに認証コードを送信します。
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>新しいメールアドレス</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={s.input} placeholder="example@aftialoop.com" />
              </div>
              <button onClick={handleRequest} disabled={loading} style={s.submitBtn}>
                {loading ? <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> : "認証コードを送信する"}
              </button>
            </div>
          )}
          {step === "VERIFY" && (
            <div>
              <p style={{ textAlign: "center", fontSize: 14, color: "#5c5a56", marginBottom: 24 }}><strong>{newEmail}</strong> に認証コードを送信しました。</p>
              <div style={s.formGroup}>
                <label style={s.label}>認証コード（6桁）</label>
                <input type="text" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} style={{ ...s.input, textAlign: "center", fontSize: 24, letterSpacing: "0.5em" }} placeholder="000000" />
              </div>
              <button onClick={handleVerify} disabled={loading || code.length < 6} style={{ ...s.submitBtn, opacity: code.length < 6 ? 0.4 : 1 }}>
                {loading ? <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> : "認証して変更完了"}
              </button>
              <button onClick={() => setStep("INPUT")} style={{ width: "100%", marginTop: 12, background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#8c8c8c", textDecoration: "underline" }}>メールアドレスを入力し直す</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
