import React, { useState, useEffect } from 'react';

import { Content, Customer, Address, Payment } from '../types/Content';

import api from '../conf/api';
import LoginModal from '../modal/Login';
import SuccessCheckout from '../modal/SuccessCheckout';

import { chargeCard, chargePoint } from '../conf/function';


interface DirectCheckoutModalProps {
  item: Content;
  isOpen: boolean;
  quantity?: number; // 数量をオプションとして追加
  onClose: () => void;
}

const DirectCheckoutModal: React.FC<DirectCheckoutModalProps> = ({ item, isOpen, onClose, quantity }) => {
  const [paymentMethod, setPaymentMethod] = useState('point');
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [defaultCard, setDefaultCard] = useState<Payment | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [address, setAddress] = useState<Address | null>(null); // 住所情報を格納するためのステート
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const handleLoginSuccess = () => {
    setReloadTrigger(prev => prev + 1); // トリガーを変えることでuseEffect再発火
  };

  const fetchAddress = async (id: string) => {
    try {
      const response = await api.post(`/address/get`, { id: id });
      console.log("住所情報:", response.data);
      setAddress(response.data || null);
    } catch (error) {
      console.error("住所情報の取得に失敗しました:", error);
    }
  };

  const fetchDefaultCard = async (id: string) => {
    try {
      const response = await api.post(`/card/get`, { cardID: id });
      setDefaultCard(response.data.card || null);
      console.log("デフォルトカード情報:", response.data.card);
    } catch (error) {
      console.error("デフォルトカード情報の取得に失敗しました:", error);
    }
  };

  useEffect(() => {
    // ユーザー情報を取得(デフォルトアドレス、ポイント残高,決済方法など)
    // ここでAPIを呼び出してデフォルトアドレスやポイント残高を取得する処理を追加

    const fetchUserData = async () => {

      api.post("customer",)
        .then((res) => {
          console.log(res.data);
          if (!res.data.user.id) {
            // IDが取れなかったら強制ログアウト
            localStorage.removeItem("token");
            localStorage.removeItem("expirationTime");
            setLoginModalOpen(true);
          } else {
            setCustomer(res.data.user);
            localStorage.setItem("token", res.data.token); // トークン更新あれば保存
            fetchAddress(res.data.address); // デフォルトアドレスIDを使って住所情報を取得
            fetchDefaultCard(res.data.user.defaultCard); // デフォルトカードIDを使ってカード情報を取得
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
  const customerPoint = customer?.point || 0;
  const canUsePoints = customerPoint >= item.point * (quantity || 1);

  const handleSubmit = () => {
    // 購入処理を実装
    setError('');
    if (paymentMethod === 'point') {
      if (!canUsePoints) {
        setError('ポイント残高が不足しています。');
        return;
      }
      // ポイント決済処理（仮）
      chargePoint({
        price: price,
        cardID: '',
        customerID: customer?.id || '',
        items: [item],
        addressID: address?.ID || ''
      });
      console.log('ポイントで支払い');
    } else {

      try {
        chargeCard({
          price: price,
          cardID: defaultCard?.ID || '',
          customerID: customer?.id || '',
          items: [item],
          addressID: address?.ID || ''
        });
      } catch (error) {
        console.error('決済処理に失敗:', error);
        setError('決済処理に失敗しました。');
        return;
      }
    };
    // 決済成功後の処理
    setIsSuccess(true);
    return;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-xl w-full max-w-md">
          {//thanks 表示に変更
            isSuccess && (
              <>
                <button
                  onClick={onClose}
                  className="absolute text-gray-500 hover:text-gray-700">
                  閉じる
                </button>
                <SuccessCheckout />

              </>
            )}
          {!isSuccess && (
            <>
              <h2 className="text-xl font-bold mb-4">この商品を購入</h2>

              <div className="mb-4">
                <h3 className="font-semibold">📦 商品情報</h3>
                <p>{item.name}</p>
                <p>¥{price.toLocaleString()}</p>
                <p>数量: {quantity || 1}</p>
              </div>

              <section className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold border-b pb-2 mb-2">📍 お届け先</h2>
                <p>{address?.Name}</p>
                <p>{address?.PostCode}</p>
                <p>{address?.Address1} {address?.Address2} {address?.Address3}</p>
              </section>

              <section className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold">💳 支払い方法</h3>
                <label className="block">
                  <input
                    type="radio"
                    value="credit"
                    checked={paymentMethod === 'credit'}
                    onChange={() => setPaymentMethod('credit')}
                    className="mr-2"
                  />
                  クレジットカード（{defaultCard?.CardBrand || ''} **** {defaultCard?.Last4 || ''}）
                </label>
                <label className="block">
                  <input
                    type="radio"
                    value="point"
                    checked={paymentMethod === 'point'}
                    onChange={() => setPaymentMethod('point')}
                    className="mr-2"
                  />
                  ポイントで支払う（残高：{customer?.point || 0}pt）
                </label>
              </section>

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

            </>
          )}

          {/* ログインモーダル */}
          {isLoginModalOpen && (
            <LoginModal isOpen={isLoginModalOpen} onClose={() => { setLoginModalOpen(false); onClose(); }} onLoginSuccess={handleLoginSuccess} showCloseButton={true} />
          )}
        </div>
      </div>
    </>
  );
}

export default DirectCheckoutModal;
