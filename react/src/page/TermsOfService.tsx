import React from 'react';
import { Header } from '../component/Header';
import { Footer } from '../component/Footer';
import { s } from '../styles/page/TermsOfService.styles';

const TermsOfService: React.FC = () => (
  <div style={s.page}>
    <Header />
    <main style={s.main}>
      <div style={s.card}><h1 style={s.title}>利用規約</h1><p>利用規約の内容をここに記載します。</p></div>
    </main>
    <Footer />
  </div>
);

export default TermsOfService;
