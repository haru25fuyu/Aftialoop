import React from 'react';
import { s } from '../styles/modal/SuccessCheckout.styles';

const SuccessCheckout: React.FC = () => (
  <>
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontWeight: 600, marginBottom: 8 }}>🎉 購入が完了しました！</h3>
      <p>ご利用ありがとうございました。</p>
    </div>
  </>
);

export default SuccessCheckout;
