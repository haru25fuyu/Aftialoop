import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { Address, Content, Payment } from '../types/Content';
import { Customer } from '../types/Content';

import api from '../conf/api';
import { chargeCard, chargePoint } from '../conf/function';

import LoginModal from '../modal/Login';
import SquarePayment from '../modal/EditPayment';

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('point');
  const [error, setError] = useState('');
  const [item, setItem] = useState<Content[]>([]); // 商品情報を格納するためのステート
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [address, setAddress] = useState<Address | null>(null); // 住所情報を格納するためのステート
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [paymentList, setPaymentList] = useState<Payment[]>([]); // 支払い方法のリスト
  const [selectCard, setSelectCard] = useState<string>(''); // 選択されたカードID
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
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

  const fetchPaymentList = async () => {
    api.post("/card/list",)
      .then((res) => {
        console.log(res.data);
        setPaymentList(res.data.card);
        console.log("カード一覧取得:", res.data.card);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  useEffect(() => {
    // ローカルストレージに保存されている商品情報を取得
    const getCart: Content[] = JSON.parse(localStorage.getItem('checkout') || '[]');
    setItem(getCart);

    console.log('Checkout page loaded with items:', getCart);
    // カートが空ならカートページへリダイレクト
    if (!getCart || getCart.length === 0) {
      navigate('/cart');
      return;
    }

    api.post("customer",)
      .then((res) => {
        console.log(res.data);
        if (!res.data.user) {
          setCustomer(null);
          setLoginModalOpen(true);
        } else {
          setCustomer(res.data.user);
          // ローカルストレージから選択した住所を取得
          const selectedAddress = localStorage.getItem('selectedAddress');
          if (selectedAddress) {
            const addressData: Address = JSON.parse(selectedAddress);
            setAddress(addressData);
            //ローカルの住所を削除
            localStorage.removeItem('selectedAddress');
          } else if (res.data.user.defaultAddress) {
            fetchAddress(res.data.user.defaultAddress); // デフォルトアドレスIDを使って住所情報を取得
          } else {
            setAddress(null); // デフォルトアドレスがない場合はnullに設定
          }
          setSelectCard(res.data.user.defaultCard || ''); // デフォルトカードIDを
          fetchPaymentList(); // 支払い方法のリストを取得
        }
      })
      .catch((err) => {
        setCustomer(null);
        setLoginModalOpen(true);
        console.error(err);
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

  const funcSelectCard = (cardID: string) => {
    setPaymentMethod(`credit${cardID}`);
    console.log(`選択されたカードID: ${cardID}`);
    setSelectCard(cardID);
  };

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
        price: totalPoints,
        cardID: '',
        customerID: customer?.id || '',
        items: item,
        addressID: address?.ID || ''
      });
      console.log('ポイントで支払い');
    } else {
      // クレカ（Square）決済処理（仮）
      // 住所と何を買ったかもサーバーに送る
      console.log('クレジットカードで支払い' + selectCard);
      // ここでSquareのAPIを呼び出して決済処理を行う

      try {
        chargeCard({
          price: totalPrice,
          cardID: selectCard || '',
          customerID: customer?.id || '',
          items: item,
          addressID: address?.ID || ''
        });
      } catch (error) {
        console.error('決済処理に失敗:', error);
        setError('決済処理に失敗しました。');
        return;
      }
    };
    // 決済成功後の処理
    localStorage.removeItem('checkout'); // 購入完了後はカートをクリア
    navigate('/checkout/complete'); // 購入完了後は完了ページへリダイレクト
    return;
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
            <Link to={`/checkout/address`} className="text-blue-500 hover:underline text-sm">お届け先を変更する</Link>
          </section>

          {/* 支払い方法 */}
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold border-b pb-2 mb-2">💳 支払い方法</h2>
            <div className="space-y-2">
              <label className="flex items-center mb-2">
                <input
                  type="radio"
                  value="point"
                  checked={paymentMethod === 'point'}
                  onChange={() => setPaymentMethod('point')}
                  className="mr-2"
                />
                ポイントで支払う（残高：{customer?.point.toLocaleString() || 0}pt）
              </label>

              <hr className="my-4 border-t border-gray-300" />

              {paymentList
                ?.slice()
                .sort((a, b) => {
                  if (a.ID === customer?.defaultCard) return -1;
                  if (b.ID === customer?.defaultCard) return 1;
                  return 0;
                })
                .map((item) => (
                  <>
                    <label className="flex items-center mb-2" key={item.ID}>
                      <input
                        type="radio"
                        value={`credit${item.ID}`}
                        checked={paymentMethod === `credit${item.ID}`}
                        onChange={() => funcSelectCard(item.ID)}
                        className="mr-2"
                      />
                      クレジットカード（{item.CardBrand}**** {item.Last4}）
                      <span className="text-sm text-gray-500 ml-2">
                        有効期限: {item.ExpMonth}/{item.ExpYear}
                      </span>
                    </label>
                    <hr className="my-4 border-t border-gray-300" />
                  </>
                ))}
              <a onClick={() => { setIsPaymentModalOpen(true) }} className="text-blue-500 hover:underline text-sm">支払い方法を変更する</a>
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

            <span>残りポイント：{((customer?.point === undefined ? 0 : customer.point) - totalPoints).toLocaleString()}pt</span>

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
            >
              購入を確定する
            </button>
          </section>


        </div>
      </main>

      {/* ログインモーダル */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => { setLoginModalOpen(false) }} onLoginSuccess={handleLoginSuccess} showCloseButton={true} />
      {/* 支払い方法モーダル */}
      {isPaymentModalOpen && (
        <SquarePayment
          setPayments={setPaymentList}
          id={""}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setReloadTrigger(prev => prev + 1); // 支払い方法を更新したらリロードトリガーを増やす
            setIsPaymentModalOpen(false);
          }}
          openMode={"card"}

        />
      )}
    </>
  );
};

export default Checkout;
