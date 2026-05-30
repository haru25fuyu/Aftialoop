import React from 'react';
import { Header } from '../component/Header';
import { Footer } from '../component/Footer';
import { s } from '../styles/page/PrivacyPolicy.styles';

const PrivacyPolicy: React.FC = () => (
  <div style={s.page}>
    <Header />
    <main style={s.main}>
      <div style={s.card}><h1 style={s.title}>プライバシーポリシー</h1><p>プライバシーポリシーの内容をここに記載します。</p></div>
    </main>
    <Footer />
  </div>
);

export default PrivacyPolicy;
