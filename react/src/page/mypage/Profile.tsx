import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Header } from "../../component/Header";
import LoginModal from "../../modal/Login";
import { Avatar } from "../../component/Avatar";
import { Mail, Phone, Calendar, User, ShieldCheck, ChevronRight, KeyRound, Globe } from "lucide-react";
import api, { getAccessToken } from "../../conf/api";
import { Spinner } from "../../component/Spinner";
import { LoadingButton } from "../../component/LoadingButton";
import { s } from "../../styles/page/mypage/Profile.styles";

type UserData = { id: string; name: string; username?: string; email: string; icon_url: string; phone: string; bio: string; birth: string; gender: string; is_google_connected?: boolean; is_apple_connected?: boolean; };

const MyProfilePage: React.FC = () => {
  const location = useLocation();
  const isChanged = location.state?.changed;
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || token === "undefined") { setLoginModalOpen(true); return; }
    api.post("/profile/get", {}).then((res) => {
      const u = res.data;
      setUser({ ...u, phone: u.phone_number || "未設定", bio: u.bio || "自己紹介が設定されていません", birth: u.date_of_birth || "未設定", gender: u.gender === "1" ? "男性" : u.gender === "2" ? "女性" : "未回答", is_google_connected: u.is_google_connected, is_apple_connected: u.is_apple_connected });
    }).catch(() => setLoginModalOpen(true));
  }, [reloadTrigger]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await api.post("/auth/logout", {}); } catch {}
    finally { localStorage.removeItem("access_token"); window.location.href = "/"; }
  };

  if (!user) return (
    <div style={s.page}>
      <Header />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16, color: "#8c8c8c" }}>
        <Spinner size="lg" />
        <p style={{ fontSize: 14, fontWeight: 500 }}>プロフィールを読み込んでいます...</p>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <Header />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setLoginModalOpen(false)} onLoginSuccess={() => setReloadTrigger(p => p+1)} />
      <main style={{ maxWidth: 640, margin: "0 auto", paddingTop: 24, paddingLeft: 16, paddingRight: 16 }}>
        {isChanged && (
          <div style={{ marginBottom: 24, backgroundColor: "#f0fae8", border: "1px solid #8fce6e", color: "#3a7a22", padding: "12px 16px", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14 }}>
            ✅ プロフィールを更新しました
          </div>
        )}
        <div style={s.card}>
          {/* プロフィール上部 */}
          <div style={s.profileTop}>
            <Avatar src={user.icon_url} name={user.name} size={128} />
            <h1 style={s.name}>{user.name}</h1>
            {user.username && <p style={{ color: "#8c8c8c", textAlign: "center" }}>@{user.username}</p>}
            <Link to="/mypage/profile/edit" style={s.editBtn}>プロフィールを編集</Link>
          </div>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 40 }}>
            {/* 公開情報 */}
            <section style={s.section}>
              <h3 style={s.sectionTitle}><User size={14} style={{ display: "inline", marginRight: 4 }} />公開情報</h3>
              <div style={{ backgroundColor: "#f8f7f5", borderRadius: 16, padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, fontWeight: 900, color: "#8c8c8c", textTransform: "uppercase" as const }}>自己紹介</label>
                  <p style={{ color: "#5c5a56", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{user.bio}</p>
                </div>
                <div style={{ paddingTop: 16, borderTop: "1px solid #e0ddd8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Calendar size={16} style={{ color: "#8c8c8c" }} /><span style={{ fontSize: 12, fontWeight: 700, color: "#8c8c8c" }}>性別・誕生日</span></div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#2e3128" }}>{user.gender} / {user.birth}</span>
                </div>
              </div>
            </section>
            {/* 連絡先 */}
            <section style={s.section}>
              <h3 style={s.sectionTitle}><ShieldCheck size={14} style={{ display: "inline", marginRight: 4 }} />連絡先・本人確認</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[{ to: "/mypage/settings/email", icon: <Mail size={20} />, label: "メールアドレス", value: user.email }, { to: "/mypage/settings/phone", icon: <Phone size={20} />, label: "電話番号", value: user.phone }].map(({ to, icon, label, value }) => (
                  <Link key={to} to={to} style={s.infoRow}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={s.infoIcon}>{icon}</div>
                      <div><p style={{ fontSize: 10, fontWeight: 900, color: "#8c8c8c", textTransform: "uppercase" as const }}>{label}</p><p style={{ fontSize: 14, fontWeight: 700, color: "#2e3128" }}>{value}</p></div>
                    </div>
                    <ChevronRight size={18} style={{ color: "#c4c1bb" }} />
                  </Link>
                ))}
              </div>
            </section>
            {/* ログアウト */}
            <div style={{ paddingTop: 24, borderTop: "1px solid #e0ddd8" }}>
              <LoadingButton loading={isLoggingOut} onClick={handleLogout}
                style={{ width: "100%", padding: "12px 0", borderRadius: 12, backgroundColor: "#d63c20", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>
                ログアウト
              </LoadingButton>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyProfilePage;
