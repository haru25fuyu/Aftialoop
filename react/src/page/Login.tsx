import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Header } from '../component/Header';
import GoogleOAuth from '../component/GoogleOAuth';
import { LoadingButton } from '../component/LoadingButton';
import api, { afterLogin } from '../conf/api';
import { s } from '../styles/page/Login.styles';

type Inputs = { email: string; password: string; };

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: Inputs) => {
    setLoading(true);
    try {
      const res = await api.post("/login", data);
      await afterLogin(res.data.access_token);
      navigate('/');
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.err_message ?? "ログインに失敗しました" : "予期しないエラーが発生しました");
    } finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <Header />
      <div style={s.wrap}>
        <div style={s.card}>
          <h2 style={s.title}>ログイン</h2>
          <GoogleOAuth mode="login" onLoginSuccess={() => navigate('/')} onError={(msg) => setError(msg)} />
          <div style={s.divider}><div style={s.divLine} /><span>or</span><div style={s.divLine} /></div>
          {error && <div style={s.errAlert}>{error}</div>}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={s.formGroup}>
              <label style={s.label}>メールアドレス</label>
              <input type="email" {...register('email', { required: 'メールアドレスは必須です' })} style={s.input} />
              {errors.email && <p style={s.errMsg}>{errors.email.message}</p>}
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>パスワード</label>
              <input type="password" {...register('password', { required: 'パスワードは必須です' })} style={s.input} />
              {errors.password && <p style={s.errMsg}>{errors.password.message}</p>}
            </div>
            <LoadingButton type="submit" loading={loading} style={s.submitBtn}>ログイン</LoadingButton>
          </form>
          <div style={{ ...s.footer, marginTop: 16 }}>
            <Link to="/password-reset" style={s.link}>パスワードを忘れた方</Link>
            <span style={s.sep}>|</span>
            <Link to="/signup" style={s.link}>新規登録はこちら</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
