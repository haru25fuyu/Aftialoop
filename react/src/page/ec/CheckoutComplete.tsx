import React from 'react';
import { Link } from 'react-router-dom';

const CheckoutComplete: React.FC = () => {
    return (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h1>ご注文ありがとうございます！</h1>
            <p>ご注文が正常に完了しました。</p>
            <p>ご登録のメールアドレスに確認メールを送信しました。</p>
            <Link to="/" style={{ marginTop: '24px', display: 'inline-block', textDecoration: 'none', color: '#fff', background: '#4caf50', padding: '12px 32px', borderRadius: '4px' }}>
                ホームへ戻る
            </Link>
        </div>
    );
};

export default CheckoutComplete;