import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Header } from '../component/Header';
import api from '../conf/api';
import { s } from '../styles/page/PasswordResetRequest.styles';

type Inputs = { email: string; };

const PasswordResetRequest: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: Inputs) => {
    setLoading(true); setMessage(''); setError('');
    try { await api.post('/password-reset/request', data); setMessage('パスワード再設定用のメールを送信しました。メールボックスをご確認ください。'); }
    catch { setError('送信に失敗しました。時間をおいて再度お試しください。'); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <Header />
      <div style={s.wrap}>
        <div style={s.card}>
          <h2 style={s.title}>パスワード再設定</h2>
          <p style={{ fontSize: 14, color: "#5c5a56", textAlign: "center", marginBottom: 24 }}>ご登録のメールアドレスを入力してください。<br />再設定用のリンクをお送りします。</p>
          {message ? (
            <div style={{ padding: 16, backgroundColor: "#f0fae8", color: "#3a7a22", borderRadius: 8 }}>{message}</div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              {error && <p style={s.errMsg}>{error}</p>}
              <div style={s.formGroup}>
                <label style={s.label}>メールアドレス</label>
                <input type="email" {...register('email', { required: 'メールアドレスは必須です' })} style={s.input} placeholder="example@aftialoop.com" />
                {errors.email && <p style={s.errMsg}>{errors.email.message}</p>}
              </div>
              <button type="submit" disabled={loading} style={s.submitBtn}>{loading ? '送信中...' : 'メールを送信する'}</button>
            </form>
          )}
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Link to="/login" style={s.link}>ログイン画面に戻る</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetRequest;
