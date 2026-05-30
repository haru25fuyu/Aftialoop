import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Smartphone, Send, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { AxiosError } from "axios";
import { Header } from "../../component/Header";
import api from "../../conf/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../conf/function";
import { s } from "../../styles/page/mypage/SMSVerification.styles";

export default function SMSVerification() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState<"INPUT_PHONE" | "INPUT_CODE" | "COMPLETE">("INPUT_PHONE");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendSMS = async () => {
    if (!phoneNumber) { toast({ text: "電話番号を入力してください", kind: "error" }); return; }
    setLoading(true);
    try { await api.post("/sms/send", { phone_number: phoneNumber }); toast({ text: "認証コードを送信しました", kind: "success" }); setStep("INPUT_CODE"); }
    catch (e) { const err = e as AxiosError; const msg = String(err.response?.data || ""); toast({ text: msg.includes("already in use") ? "この電話番号は既に使用されています" : "送信に失敗しました", kind: "error" }); }
    finally { setLoading(false); }
  };

  const handleVerifySMS = async () => {
    if (!code || code.length < 6) { toast({ text: "6桁の認証コードを入力してください", kind: "error" }); return; }
    setLoading(true);
    try { await api.post("/sms/verify", { phone_number: phoneNumber, code, user_id: user?.id }); await refreshUser(); setStep("COMPLETE"); toast({ text: "本人確認が完了しました！", kind: "success" }); }
    catch (e) { const err = e as AxiosError; const msg = String(err.response?.data || ""); toast({ text: msg.includes("Invalid code") ? "認証コードが正しくありません" : msg || "認証に失敗しました", kind: "error" }); }
    finally { setLoading(false); }
  };

  if (step === "COMPLETE") return (
    <>
      <Header />
      <div style={{ minHeight: "100vh", backgroundColor: "#fff", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <CheckCircle2 size={80} style={{ color: "#3a7a22", marginBottom: 24 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>電話番号の認証が完了しました！</h2>
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
            <Smartphone size={20} /><h2 style={s.title}>電話番号認証</h2>
          </div>
          {step === "INPUT_PHONE" && (
            <div>
              <p style={{ fontSize: 14, color: "#5c5a56", marginBottom: 24 }}>SMSで認証コードを送信します。</p>
              <div style={s.formGroup}>
                <label style={s.label}>電話番号</label>
                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} style={s.input} placeholder="09012345678" />
              </div>
              <button onClick={handleSendSMS} disabled={loading} style={s.submitBtn}>
                {loading ? <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> : <><Send size={18} style={{ display: "inline", marginRight: 8 }} />認証コードを送信</>}
              </button>
            </div>
          )}
          {step === "INPUT_CODE" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <p style={{ fontSize: 14, color: "#8c8c8c" }}>認証コードを送信しました</p>
                <p style={{ fontSize: 18, fontWeight: 700 }}>{phoneNumber}</p>
              </div>
              <div style={s.formGroup}>
                <label style={{ ...s.label, textAlign: "center" }}>6桁の認証コード</label>
                <input type="text" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} style={{ ...s.input, textAlign: "center", fontSize: 24, letterSpacing: "0.5em" }} placeholder="123456" />
              </div>
              <button onClick={handleVerifySMS} disabled={loading || code.length < 6} style={{ ...s.submitBtn, opacity: code.length < 6 ? 0.4 : 1 }}>
                {loading ? <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> : "認証して完了する"}
              </button>
              <button onClick={() => setStep("INPUT_PHONE")} style={{ width: "100%", marginTop: 12, background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#8c8c8c", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <RefreshCw size={14} />電話番号を入力し直す
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
