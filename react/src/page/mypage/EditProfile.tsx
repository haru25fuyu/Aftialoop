import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import { Header } from "../../component/Header";
import { Avatar } from "../../component/Avatar";
import { LoadingButton } from "../../component/LoadingButton";
import api, { getAccessToken } from "../../conf/api";
import { CONFIG } from "../../conf/config";
import { s } from "../../styles/page/mypage/EditProfile.styles";

type Inputs = { name: string; username: string; bio: string; gender: string; birth: string; };
type UserData = { name: string; username?: string; bio: string; gender: string; birth: string; icon_url: string; email: string; phone: string; };

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Inputs>();
  const [user, setUser] = useState<UserData | null>(null);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentPhone, setCurrentPhone] = useState("");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);

  useEffect(() => {
    api.post("/profile/get", {}).then((res) => {
      const u = res.data;
      setUser(u); setCurrentEmail(u.email || ""); setCurrentPhone(u.phone_number || ""); setIconUrl(u.icon_url || null);
      reset({ name: u.name || "", username: u.username || "", bio: u.bio || "", gender: u.gender || "", birth: u.date_of_birth || "" });
    }).catch(() => navigate("/login"));
  }, []);

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, v));
      if (iconFile) formData.append("icon", iconFile);
      await api.post("/profile/update", formData, { headers: { "Content-Type": "multipart/form-data" } });
      navigate("/mypage/profile", { state: { changed: true } });
    } catch { alert("保存に失敗しました"); }
  };

  if (!user) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <div style={s.page}>
      <Header />
      <div style={s.wrap}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* アバター */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
            <div style={{ position: "relative" as const, marginBottom: 16 }}>
              <Avatar src={iconUrl} name={user.name} size={128} />
              <label style={{ position: "absolute" as const, bottom: 0, right: 0, backgroundColor: "#1a1a1a", color: "#fff", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>
                ✎<input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setIconFile(f); setIconUrl(URL.createObjectURL(f)); } }} />
              </label>
            </div>
          </div>

          <div style={s.section}>
            <h3 style={s.sectionTitle}>公開情報</h3>
            {[
              { name: "name" as const, label: "表示名", placeholder: "Aftialoop", rules: { required: "表示名は必須です", maxLength: { value: 30, message: "30文字以内で入力してください" } } },
              { name: "username" as const, label: "ユーザーネーム（@）", placeholder: "username", rules: { pattern: { value: /^[a-zA-Z0-9_]+$/, message: "英数字とアンダースコアのみ使用できます" } } },
            ].map(({ name, label, placeholder, rules }) => (
              <div key={name} style={s.formGroup}>
                <label style={s.label}>{label}</label>
                <input {...register(name, rules)} placeholder={placeholder} style={s.input} />
                {errors[name] && <p style={s.errMsg}>{errors[name]?.message}</p>}
              </div>
            ))}
            <div style={s.formGroup}>
              <label style={s.label}>自己紹介</label>
              <textarea {...register("bio", { maxLength: { value: 500, message: "500文字以内で入力してください" } })} placeholder="生き物が好きな人です。" rows={5} style={{ ...s.input, resize: "vertical", fontFamily: "inherit" }} />
            </div>
          </div>

          <div style={s.section}>
            <h3 style={s.sectionTitle}>非公開情報</h3>
            {[{ to: "/mypage/settings/email", label: "メールアドレス", value: currentEmail }, { to: "/mypage/settings/phone", label: "電話番号", value: currentPhone }].map(({ to, label, value }) => (
              <div key={to} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 12, border: "1px solid #e0ddd8", backgroundColor: "#f8f7f5", marginBottom: 12 }}>
                <div><p style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 700, marginBottom: 2 }}>{label}</p><p style={{ fontSize: 14, fontWeight: 500, color: "#2e3128" }}>{value || "未設定"}</p></div>
                <Link to={to} style={{ fontSize: 14, fontWeight: 700, color: "#3a7a22", textDecoration: "none" }}>変更</Link>
              </div>
            ))}
            <div style={s.formGroup}>
              <label style={s.label}>誕生日</label>
              <input type="date" {...register("birth")} style={s.input} />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>性別</label>
              <select {...register("gender")} style={s.input}>
                <option value="">選択してください</option>
                <option value="1">男性</option>
                <option value="2">女性</option>
                <option value="9">その他</option>
              </select>
            </div>
            <div style={{ textAlign: "right" }}>
              <Link to="/mypage/password" style={{ fontSize: 14, fontWeight: 700, color: "#3a7a22", textDecoration: "none" }}>パスワードを変更する</Link>
            </div>
          </div>

          <div style={{ paddingTop: 16 }}>
            <LoadingButton type="submit" loading={isSubmitting}
              style={{ width: "100%", padding: "14px 0", borderRadius: 12, backgroundColor: "#3a7a22", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 16 }}>
              変更を保存する
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
