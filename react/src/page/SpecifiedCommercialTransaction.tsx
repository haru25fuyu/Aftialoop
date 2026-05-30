import React from 'react';
import { Header } from '../component/Header';
import { Footer } from '../component/Footer';
import { s } from '../styles/page/SpecifiedCommercialTransaction.styles';

export const SpecifiedCommercialTransaction: React.FC = () => (
  <div style={s.page}>
    <Header />
    <main style={s.main}>
      <div style={s.card}><h1 style={s.title}>特定商取引法に基づく表記</h1><p>特定商取引法に基づく表記の内容をここに記載します。</p></div>
    </main>
    <Footer />
  </div>
);

export default SpecifiedCommercialTransaction;
