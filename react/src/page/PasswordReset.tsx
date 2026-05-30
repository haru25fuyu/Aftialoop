import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../component/Header';
import PasswordInput from '../component/PasswordInput';
import api from '../conf/api';
import { s } from '../styles/page/PasswordReset.styles';

type Inputs = { current_password: string; new_password: string; new_password_confirm: string; };

const PasswordReset: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<Inputs>();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const newPassword = watch("new_password");

  useEffect(() => {
    api.post('/profile/get', {}).then((res) => setHasPassword(!!res.data.has_password)).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const onSubmit = async (data: Inputs) => {
    setServerError(null);
    try {
      await api.post('/user/password/change', { current_password: data.current_password, new_password: data.new_password });
      navigate('/mypage/profile', { replace: true, state: { changed: true, message: "パスワードを変更しました" } });
    } catch (e: any) {
      setServerError(e.response?.data?.err_message || "パスワードの変更に失敗しました。");
    }
  };

  if (isLoading) return <div style={{ padding: 40, textAlign: "center" }}>読み込み中...</div>;

  return (
    <div style={s.page}>
      <Header />
      <div style={s.wrap}>
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={s.title}>パスワード変更</h2>
            <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#8c8c8c" }}>キャンセル</button>
          </div>
          {!hasPassword && <div style={{ marginBottom: 24, backgroundColor: "#e8f0fe", border: "1px solid #93b3f5", color: "#1a3c8c", padding: 12, borderRadius: 8, fontSize: 14 }}>ℹ️ パスワードが未設定です。新しく設定してください。</div>}
          {serverError && <div style={{ marginBottom: 24, backgroundColor: "#fef0ec", border: "1px solid #f0a890", color: "#d63c20", padding: 12, borderRadius: 8, fontSize: 14 }}>⚠️ {serverError}</div>}
          <form onSubmit={handleSubmit(onSubmit)}>
            {hasPassword && (
              <>
                <PasswordInput label="現在のパスワード" name="current_password" register={register} registerRules={{ required: '現在のパスワードを入力してください' }} show={showCurrent} toggleShow={() => setShowCurrent(!showCurrent)} error={errors.current_password} />
                <div style={{ textAlign: "right", marginTop: -8, marginBottom: 16 }}>
                  <Link to="/password-reset" style={{ fontSize: 12, color: "#1a3c8c" }}>現在のパスワードを忘れた方はこちら</Link>
                </div>
              </>
            )}
            <div style={{ borderTop: "1px solid #e0ddd8", marginBottom: 16 }} />
            <PasswordInput label="新しいパスワード" name="new_password" register={register} registerRules={{ required: '新しいパスワードを入力してください', minLength: { value: 8, message: '8文字以上で入力してください' } }} show={showNew} toggleShow={() => setShowNew(!showNew)} error={errors.new_password} />
            <PasswordInput label="新しいパスワード（確認）" name="new_password_confirm" register={register} registerRules={{ required: '確認のためもう一度入力してください', validate: (value: string) => value === newPassword || 'パスワードが一致しません' }} show={showConfirm} toggleShow={() => setShowConfirm(!showConfirm)} error={errors.new_password_confirm} />
            <button type="submit" style={s.submitBtn}>パスワードを変更する</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;
