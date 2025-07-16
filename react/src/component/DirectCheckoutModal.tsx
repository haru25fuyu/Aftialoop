import React, { useState, useEffect } from 'react';

import { Content } from '../types/Content';
import api from '../conf/api';
import LoginModal from '../modal/Login';


interface DirectCheckoutModalProps {
  item: Content;
  isOpen: boolean;
  onClose: () => void;
}

const DirectCheckoutModal: React.FC<DirectCheckoutModalProps> = ({ item, isOpen, onClose }) => {
  const [paymentMethod, setPaymentMethod] = useState('point');
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [defaultAddress, setDefaultAddress] = useState<string | null>(null);
  const [defaultCard, setDefaultCard] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const handleLoginSuccess = () => {
    setReloadTrigger(prev => prev + 1); // トリガーを変えることでuseEffect再発火
  };

  useEffect(() => {
    // ユーザー情報を取得(デフォルトアドレス、ポイント残高,決済方法など)
    // ここでAPIを呼び出してデフォルトアドレスやポイント残高を取得する処理を追加

    const fetchUserData = async () => {

      api.post("/customer/data",)
        .then((res) => {
          console.log(res.data);
          setDefaultCard(res.data.user.defaultCard);
          if (!res.data.user.id) {
            // IDが取れなかったら強制ログアウト
            localStorage.removeItem("token");
            localStorage.removeItem("expirationTime");

          } else {
            setCustomerId(res.data.user.id);
            localStorage.setItem("token", res.data.token); // トークン更新あれば保存
          }
        })
        .catch((err) => {
          console.error(err);
          localStorage.removeItem("token");
          localStorage.removeItem("expirationTime");
        });

    };

    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen, reloadTrigger]);

  if (!isOpen) return null;

  const price = item.price;
  const canUsePoints = 100 >= price;

  const handleSubmit = () => {
    // 購入処理を実装
    setError('');
    if (paymentMethod === 'point') {
      if (!canUsePoints) {
        setError('ポイント残高が不足しています。');
        return;
      }
      // ポイント決済処理（仮）
      console.log('ポイントで支払い');
      onClose();
    } else {
      // クレカ（Square）決済処理（仮）
      // 住所と何を買ったかもサーバーに送る
      console.log('クレジットカードで支払い');
      // ここでSquareのAPIを呼び出して決済処理を行う
      api.post('/api/card/charge', {
        amount: price,
        cardID: defaultCard,
        customerID: customerId,
      })
        .then((res) => {
          console.log('決済成功:', res.data);
          // 決済成功後の処理を追加
        })
        .catch((err) => {
          console.error('決済失敗:', err);
          setError('決済に失敗しました。');
        });
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-xl w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">この商品を購入</h2>

          <div className="mb-4">
            <h3 className="font-semibold">📦 商品情報</h3>
            <p>{item.name}</p>
            <p>¥{price.toLocaleString()}</p>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold">📍 お届け先</h3>
            <p>テスト</p>
            <p>テスト</p>
            <p>テスト</p>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold">💳 支払い方法</h3>
            <label className="block">
              <input
                type="radio"
                value="credit"
                checked={paymentMethod === 'credit'}
                onChange={() => setPaymentMethod('credit')}
                className="mr-2"
              />
              クレジットカード（Visa **** 1234）
            </label>
            <label className="block">
              <input
                type="radio"
                value="point"
                checked={paymentMethod === 'point'}
                onChange={() => setPaymentMethod('point')}
                className="mr-2"
              />
              ポイントで支払う（残高：{100}pt）
            </label>
          </div>

          <div className="mb-4">
            <p className="font-semibold">
              {paymentMethod === 'point' ? `使用ポイント：${price.toLocaleString()}pt` : `合計金額：¥${price.toLocaleString()}`}
            </p>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>

          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            購入を確定する
          </button>

          <button
            onClick={onClose}
            className="mt-2 text-sm text-gray-500 underline"
          >
            キャンセル
          </button>
        </div>
      </div>
      {/* ログインモーダル */}
      <LoginModal isOpen={!customerId} onClose={() => { onClose(); }} onLoginSuccess={handleLoginSuccess} showCloseButton={true} />
    </>
  );
}

export default DirectCheckoutModal;
