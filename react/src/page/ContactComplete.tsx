import React from "react";
import { Link } from "react-router-dom";
import { Header } from "../component/Header";
import { s } from "../styles/page/ContactComplete.styles";

const ContactComplete: React.FC = () => (
  <>
    <Header />
    <main style={s.main}>
      <div style={s.card}>
        <div style={s.iconWrap}>✓</div>
        <h1 style={s.title}>送信が完了しました</h1>
        <p style={s.desc}>
          お問い合わせありがとうございます。
          <br />
          ご入力いただいたメールアドレスへ自動返信メールをお送りしました。
          <br />
          内容を確認次第、担当者より順次ご連絡させていただきますので、今しばらくお待ちください。
        </p>
        <div style={{ paddingTop: 24 }}>
          <Link to="/" style={s.btn}>
            トップページへ戻る
          </Link>
        </div>
      </div>
    </main>
  </>
);

export default ContactComplete;
