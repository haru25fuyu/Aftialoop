import React, { useEffect } from 'react';
import { Header } from '../component/Header';
import { Footer } from '../component/Footer';
import api from '../conf/api';
import { s } from '../styles/page/RegisterConfirm.styles';

const RegisterConfirm: React.FC = () => {
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    api.get('/register/confirm?token=' + token).catch(console.error);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />
      <main style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 16px" }}>
        <div style={s.card}>
          <h2 style={s.title}>本登録完了</h2>
          <p style={{ marginBottom: 16 }}>ご登録ありがとうございます！アカウントが正常に作成されました。</p>
          {localStorage.getItem('cart')
            ? <a href="/purchase" style={s.link}>購入ページへ</a>
            : <a href="/" style={s.link}>トップページへ</a>
          }
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RegisterConfirm;
