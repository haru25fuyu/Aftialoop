import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Header } from '../component/Header';
import PasswordInput from '../component/PasswordInput';
import api from '../conf/api';
import { s } from '../styles/page/PasswordResetExecute.styles';

type ResetInputs = { new_password: string; new_password_confirm: string; };

const PasswordResetExecute: React.FC = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetInputs>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const newPassword = watch("new_password");

  if (!token) return (
    <div style={s.page}>
      <Header />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
        <div style={{ padding: 20, backgroundColor: "#fef0ec", color: "#d63c20", borderRadius: 8, fontWeight: 700 }}>無効なアクセスです。メールのリンクをご確認ください。</div>
      </div>
    </div>
  );

  const onSubmit = async (data: ResetInputs) => {
    setLoading(true); setError('');
    try { await api.post('/password-reset/execute', { token, password: data.new_password }); setSuccess(true); setTimeout(() => navigate('/login'), 3000); }
    catch { setError('パスワード再設定に失敗しました。'); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <Header />
      <div style={s.wrap}>
        <div style={s.card}>
          <h2 style={s.title}>新しいパスワードの設定</h2>
          {success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ padding: 16, backgroundColor: "#f0fae8", color: "#3a7a22", borderRadius: 8, fontWeight: 700, marginBottom: 16 }}>パスワードを変更しました！<br />ログイン画面へ移動します...</div>
              <Link to="/login" style={s.link}>すぐにログインする</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              {error && <p style={{ ...s.errMsg, textAlign: "center", marginBottom: 16 }}>{error}</p>}
              <PasswordInput label="新しいパスワード" name="new_password" register={register} registerRules={{ required: 'パスワードは必須です', minLength: { value: 8, message: '8文字以上で入力してください' } }} show={showPass} toggleShow={() => setShowPass(!showPass)} error={errors.new_password} />
              <PasswordInput label="新しいパスワード（確認）" name="new_password_confirm" register={register} registerRules={{ required: '確認のため再度入力してください', validate: (value: string) => value === newPassword || 'パスワードが一致しません' }} show={showConfirm} toggleShow={() => setShowConfirm(!showConfirm)} error={errors.new_password_confirm} />
              <button type="submit" disabled={loading} style={s.submitBtn}>{loading ? '設定中...' : 'パスワードを変更する'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordResetExecute;
