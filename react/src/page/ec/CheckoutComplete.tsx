import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { s } from '../../styles/page/ec/CheckoutComplete.styles';

const CheckoutComplete: React.FC = () => {
  return (
    <div style={s.page}>
      <div style={s.icon}><CheckCircle size={32} /></div>
      <h1 style={s.title}>ご注文ありがとうございます！</h1>
      <p style={s.desc}>ご注文が正常に完了しました。</p>
      <p style={s.desc}>ご登録のメールアドレスに確認メールを送信しました。</p>
      <Link to="/" style={s.btn}>ホームへ戻る</Link>
    </div>
  );
};

export default CheckoutComplete;
