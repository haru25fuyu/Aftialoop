import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../component/Header';
import { Footer } from '../component/Footer';
import { s } from '../styles/page/Contact.styles';

const Contact: React.FC = () => (
  <div style={s.page}>
    <Header />
    <main style={s.main}>
      <div style={s.card}>
        <h1 style={s.title}>お問い合わせ</h1>
        <p style={{ color: "#5c5a56", marginBottom: 24 }}>ご不明点・ご要望はこちらからお問い合わせください。</p>
        <Link to="/contact/form" style={s.link}>お問い合わせフォームへ</Link>
      </div>
    </main>
    <Footer />
  </div>
);

export default Contact;
