import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Shield, Mail, Smartphone, Lock, FileText, HelpCircle, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Header } from "../../component/Header";
import api from "../../conf/api";
import { s } from "../../styles/page/mypage/Settings.styles";

interface AccountStatus { email: string; has_password: boolean; phone_verified: boolean; identity_status: string; }

const SettingsLink = ({ to, icon, label, sub }: { to: string; icon: React.ReactNode; label: string; sub?: React.ReactNode }) => (
  <Link to={to} style={s.row}>
    <div style={s.rowIcon}>{icon}</div>
    <div style={s.rowBody}>
      <div style={s.rowLabel}>{label}</div>
      {sub && <div style={s.rowSub}>{sub}</div>}
    </div>
    <ChevronRight size={16} style={{ color: "#c4c1bb" }} />
  </Link>
);

export default function Settings() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AccountStatus | null>(null);

  useEffect(() => { api.post("/settings/status").then((res) => setStatus(res.data)).catch(console.error); }, []);

  if (!status) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <div style={s.page}>
      <Header />
      <div style={{ maxWidth: 512, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 24, paddingBottom: 80 }}>
        {/* アカウント・セキュリティ */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>アカウント・セキュリティ</h2>
          <div style={s.sectionBody}>
            <SettingsLink to="/mypage/settings/identity" icon={<Shield size={20} />} label="本人確認"
              sub={status.identity_status === "VERIFIED" ? <span style={{ color: "#3a7a22", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={10} />完了済み</span> : <span style={{ color: "#d63c20", display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={10} />未完了（出品・振込に必要）</span>} />
            <SettingsLink to="/mypage/settings/email" icon={<Mail size={20} />} label="メールアドレス変更" sub={<span style={{ color: "#8c8c8c", fontSize: 12 }}>{status.email}</span>} />
            <SettingsLink to="/mypage/settings/phone" icon={<Smartphone size={20} />} label="電話番号認証" />
            {status.has_password && <SettingsLink to="/mypage/password" icon={<Lock size={20} />} label="パスワード変更" />}
            <SettingsLink to="/mypage/settings/blocked" icon={<Shield size={20} />} label="ブロックリスト" />
          </div>
        </section>
        {/* サポート・規約 */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>サポート・規約</h2>
          <div style={s.sectionBody}>
            <SettingsLink to="/contact" icon={<HelpCircle size={20} />} label="ヘルプ・お問い合わせ" />
            <SettingsLink to="/tos" icon={<FileText size={20} />} label="利用規約" />
            <SettingsLink to="/privacy" icon={<FileText size={20} />} label="プライバシーポリシー" />
            <SettingsLink to="/tokutei" icon={<FileText size={20} />} label="特定商取引法に基づく表記" />
          </div>
        </section>
      </div>
    </div>
  );
}
