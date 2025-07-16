import React, { useState, useEffect } from 'react';

import { Address, Content } from '../types/Content';
import api from '../conf/api';

import LoginModal from '../modal/Login';

import { Customer } from '../types/Content';

fh




const Checkout: React.FC = () => {
  const [paymentMethod, setPaymentMethod] = useState('point');
  const [error, setError] = useState('');
  const [item, setItem] = useState<Content[]>([]); // 商品情報を格納するためのステート
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [address, setAddress] = useState<Address | null>(null); // 住所情報を格納するためのステート
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const handleLoginSuccess = () => {
    setReloadTrigger(prev => prev + 1); // トリガーを変えることでuseEffect再発火
  };

  // サーバーから住所の情報を取得するための関数
  const fetchAddress = async (id: string) => {
    try {
      const response = await api.post(`/address/get`, { id: id });
      console.log('住所情報:', response.data);
      setAddress(response.data || null);
    } catch (error) {
      console.error('住所情報の取得に失敗しました:', error);
    }
  };

  useEffect(() => {
    // ユーザー情報を取得(デフォルトアドレス、ポイント残高,決済方法など)
    // ここでAPIを呼び出してデフォルトアドレスやポイント残高を取得する処理を追加

    // ローカルストレージに保存されている商品情報を取得
    const getCart: Content[] = JSON.parse(localStorage.getItem('checkout') || '{}');
    setItem(getCart);

    api.post("customer",)
      .then((res) => {
        console.log(res.data);
        if (!res.data.user) {
          // IDが取れなかったら強制ログアウト
          localStorage.removeItem("token");
          localStorage.removeItem("expirationTime");

        } else {
          setCustomer(res.data.user);
          localStorage.setItem("token", res.data.token); // トークン更新あれば保存
          if (res.data.user.defaultAddress) {
            fetchAddress(res.data.user.defaultAddress); // デフォルトアドレスIDを使って住所情報を取得
          }
        }
      })
      .catch((err) => {
        console.error(err);
        localStorage.removeItem("token");
        localStorage.removeItem("expirationTime");
      });


  }, [reloadTrigger]);

  useEffect(() => {
    if (!item || item.length === 0) return;

    const totalPrice = item
      .reduce((acc, item) => {
        const qty = item.quantity ?? 1;
        const price = Number(item.price) || 0;
        return acc + price * qty;
      }, 0);

    const totalPoints = item
      .reduce((acc, item) => {
        const qty = item.quantity ?? 1;
        const point = Number(item.point) || 0;
        return acc + point * qty;
      }, 0);

    setTotalPrice(totalPrice);
    setTotalPoints(totalPoints);
  }, [item]); // ← item が変わったときだけ再計算

  const canUsePoints = typeof customer?.point === 'number' && customer.point >= totalPoints;

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
    } else {
      // クレカ（Square）決済処理（仮）
      // 住所と何を買ったかもサーバーに送る
      console.log('クレジットカードで支払い');
      // ここでSquareのAPIを呼び出して決済処理を行う
      api.post('/api/card/charge', {
        amount: totalPrice,
        cardID: 'ccof:CA4SEBS9lZA3FcTpxqULD7CdghYoAg',
        customerID: customer?.id,
      })
        .then((res) => {
          console.log('決済成功:', res.data);
          // 決済成功後の処理を追加
        })
        .catch((err) => {
          console.error('決済失敗:', err);
          setError('決済に失敗しました。');
        });
    }
  };

  return (
    <>
      <header>
        <h1 className="text-2xl font-bold text-center my-4">購入確認</h1>
        <p className="text-center text-gray-600">購入内容を確認し、支払い方法を選択してください。</p>
      </header>

      <main className="max-w-full mx-auto p-0">
        <div className="space-y-6">

          {/* 購入内容 */}
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold border-b pb-2 mb-2">🛍️ 購入内容</h2>
            <p>購入商品数: <span className="font-semibold">{item.length}点</span></p>
            <p>合計金額: <span className="text-blue-600 font-bold">¥{totalPrice.toLocaleString()}</span></p>
            <p>ポイント利用時: <span className="text-green-600 font-bold">{totalPoints.toLocaleString()}pt</span></p>
            <p>残りポイント: {customer?.point ? (customer.point - totalPoints).toLocaleString() : 0}pt</p>
          </section>

          {/* お届け先 */}
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold border-b pb-2 mb-2">📍 お届け先</h2>
            <p>{address?.Name}</p>
            <p>{address?.PostCode}</p>
            <p>{address?.Address1} {address?.Address2} {address?.Address3}</p>
            <a href={`/address/edit/${address?.ID}`} className="text-blue-500 hover:underline text-sm">お届け先を変更する</a>
          </section>

          {/* 支払い方法 */}
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold border-b pb-2 mb-2">💳 支払い方法</h2>
            <div className="space-y-2">
              {customer?.defaultCard && (
                <label className="flex items-center">
                  <input type="radio" value="credit" checked={paymentMethod === 'credit'} onChange={() => setPaymentMethod('credit')} className="mr-2" />
                  クレジットカード（Visa **** 1234）
                </label>
              )}
              <label className="flex items-center">
                <input type="radio" value="point" checked={paymentMethod === 'point'} onChange={() => setPaymentMethod('point')} className="mr-2" />
                ポイントで支払う（残高：{customer?.point.toLocaleString() || 0}pt）
              </label>
              <a href="/checkout/payment" className="text-blue-500 hover:underline text-sm">支払い方法を変更する</a>
            </div>
          </section>

          {/* 商品一覧 */}
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold border-b pb-2 mb-4">🛒 購入商品</h2>
            {item.map((content) => (
              <div
                key={content.id}
                className="flex items-center gap-4 border-b py-3"
              >
                <img
                  src={content.main_image_url}
                  alt={content.name}
                  className="w-16 h-16 object-contain rounded border"
                />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{content.name}</p>
                  <p className="text-gray-600">数量：{content.quantity}</p>
                </div>
                <div className="text-right text-sm font-semibold min-w-[80px]">
                  ¥{(content.price * content.quantity).toLocaleString()}
                </div>
              </div>
            ))}
          </section>


          {/* 合計 & ボタン */}
          <section className="bg-white p-6 rounded-lg shadow-md text-center space-y-4">
            <p className="text-gray-700">
              {paymentMethod === 'point'
                ? `小計：${totalPoints.toLocaleString()}pt`
                : `小計：¥${totalPrice.toLocaleString()}`}
            </p>

            <div className="font-bold text-lg text-center sm:flex sm:items-center sm:justify-center sm:space-x-2">
              <span>請求金額：</span>
              {paymentMethod === 'point' ? (
                <>
                  <span>{totalPoints.toLocaleString()}pt</span>
                  <span className="block sm:inline text-sm text-gray-500">（全額ポイントでお支払い）</span>
                </>
              ) : (
                <>
                  <span>¥{totalPrice.toLocaleString()}</span>
                  <span className="block sm:inline text-sm text-gray-500">（クレジットカードでお支払い）</span>
                </>
              )}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 w-full max-w-sm mx-auto"
              onClick={handleSubmit}
              disabled={!customer || (paymentMethod === 'point' && !canUsePoints)}>
              購入を確定する
            </button>
          </section>


        </div>
      </main>

      {/* ログインモーダル */}
      <LoginModal isOpen={!customer} onClose={() => { }} onLoginSuccess={handleLoginSuccess} showCloseButton={true} />
    </>
  );
}

export default Checkout;
