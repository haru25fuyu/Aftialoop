import React from 'react';
import { Header } from '../component/Header';
import { Footer } from '../component/Footer';
import { s } from '../styles/page/NotFound.styles';

const NotFound: React.FC = () => (
  <>
    <Header />
    <main style={s.main}>
      <div style={s.wrap}>
        <h1 style={s.title}>404 - ページが見つかりません</h1>
        <p style={s.desc}>URLが間違っているか、ページが移動された可能性があります。</p>
      </div>
    </main>
    <Footer />
  </>
);

export default NotFound;
