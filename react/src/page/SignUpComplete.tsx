import React from 'react';
import { Header } from '../component/Header';
import { Footer } from '../component/Footer';
import { s } from '../styles/page/SignUpComplete.styles';

const SignUpComplete: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
    <Header />
    <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 16px" }}>
      <div style={s.card}>
        <h2 style={s.title}>仮登録完了</h2>
        <p style={{ textAlign: "center" }}>メールを送信しました。</p>
        <p style={{ textAlign: "center" }}>メール内のリンクをクリックして登録を完了してください。</p>
      </div>
    </div>
    <Footer />
  </div>
);

export default SignUpComplete;
