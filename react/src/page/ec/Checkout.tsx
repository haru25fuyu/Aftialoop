import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

import { Customer, Content } from "../../types/Content";
import { Address } from "../../types/Address";    // ✅ 正しいインポート元
import { Payment } from "../../types/Payment";    // ✅ 正しいインポート元

import api from "../../conf/api";
import { chargeCard, chargePoint } from "../../conf/function";
import SquarePayment from "../../modal/EditPayment";

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState("point");
  const [error, setError] = useState("");
  const [item, setItem] = useState<Content[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [paymentList, setPaymentList] = useState<Payment[]>([]);
  const [selectCard, setSelectCard] = useState<string>("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchAddressData = async (id: string) => {
    if (!id) return;
    try {
      const res = await api.post(`/address/get`, { id });
      setAddress(res.data || null);
    } catch {
      // 住所未設定の場合は無視
    }
  };

  const fetchPaymentList = async () => {
    try {
      const res = await api.post("/card/list");
      setPaymentList(res.data.card ?? []);
    } catch {
      // カード未登録の場合は無視
    }
  };

  // カート読み込み & ユーザー情報取得
  useEffect(() => {
    const cart: Content[] = JSON.parse(localStorage.getItem("checkout") || "[]");
    setItem(cart);
    if (!cart.length) { navigate("/cart"); return; }

    const init = async () => {
      try {
        const res = await api.post("customer");
        if (!res.data.user) { setCustomer(null); return; }

        setCustomer(res.data.user);

        const savedAddress = localStorage.getItem("selectedAddress");
        if (savedAddress) {
          setAddress(JSON.parse(savedAddress));
          localStorage.removeItem("selectedAddress");
        } else if (res.data.address) {
          await fetchAddressData(res.data.address);
        }

        // ✅ default_card (snake_case)
        setSelectCard(res.data.user.default_card || "");
        await fetchPaymentList();
      } catch {
        setCustomer(null);
      }
    };

    init();
  }, [navigate]);

  // 合計計算
  useEffect(() => {
    if (!item.length) return;
    setTotalPrice(item.reduce((acc, i) => acc + (Number(i.price) || 0) * (i.quantity ?? 1), 0));
    setTotalPoints(item.reduce((acc, i) => acc + (Number(i.point) || 0) * (i.quantity ?? 1), 0));
  }, [item]);

  const funcSelectCard = (id: string) => {
    setSelectCard(id);
    setPaymentMethod(`credit${id}`);
  };

  const handleSubmit = async () => {
    setError("");
    try {
      if (paymentMethod === "point") {
        if ((customer?.point || 0) < totalPoints) { setError("ポイント残高が不足しています。"); return; }
        await chargePoint({ price: totalPrice, cardID: "", customerID: customer?.id || "", items: item, addressID: address?.id || "" });
      } else {
        await chargeCard({ price: totalPrice, cardID: selectCard, customerID: customer?.id || "", items: item, addressID: address?.id || "" });
      }
      navigate("/checkout/complete");
    } catch {
      setError("決済処理に失敗しました。再度お試しください。");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">ご注文内容の確認</h1>

      {/* 商品情報 */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold border-b pb-2 mb-2">🛒 商品</h2>
        {item.map((i) => (
          <div key={i.id} className="flex justify-between py-2 border-b last:border-0">
            <span>{i.name}（×{i.quantity ?? 1}）</span>
            <span>¥{((Number(i.price) || 0) * (i.quantity ?? 1)).toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold mt-3">
          <span>合計</span>
          <span>¥{totalPrice.toLocaleString()}</span>
        </div>
      </section>

      {/* お届け先 */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold border-b pb-2 mb-2">📍 お届け先</h2>
        {/* ✅ Address 型は snake_case */}
        <p>{address?.name}</p>
        <p>{address?.post_code}</p>
        <p>{address?.address1} {address?.address2} {address?.address3}</p>
        <Link to="/checkout/address" className="text-blue-500 hover:underline text-sm">お届け先を変更する</Link>
      </section>

      {/* 支払い方法 */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold border-b pb-2 mb-2">💳 支払い方法</h2>
        <div className="space-y-2">
          <label className="flex items-center mb-2">
            <input type="radio" value="point" checked={paymentMethod === "point"} onChange={() => setPaymentMethod("point")} className="mr-2" />
            ポイントで支払う（残高：{customer?.point.toLocaleString() || 0}pt）
          </label>
          <hr className="my-4 border-t border-gray-300" />

          {paymentList
            ?.slice()
            // ✅ default_card (snake_case) でデフォルトカードを先頭に
            .sort((a, b) => {
              if (a.id === customer?.default_card) return -1;
              if (b.id === customer?.default_card) return 1;
              return 0;
            })
            .map((p) => (
              <React.Fragment key={p.id}>
                <label className="flex items-center mb-2">
                  <input type="radio" value={`credit${p.id}`} checked={paymentMethod === `credit${p.id}`} onChange={() => funcSelectCard(p.id)} className="mr-2" />
                  {/* ✅ Payment 型は camelCase */}
                  クレジットカード（{p.cardBrand}**** {p.last4}）
                  <span className="text-sm text-gray-500 ml-2">有効期限: {p.expMonth}/{p.expYear}</span>
                </label>
                <hr className="my-4 border-t border-gray-300" />
              </React.Fragment>
            ))}

          <button onClick={() => setIsPaymentModalOpen(true)} className="text-blue-500 hover:underline text-sm">
            支払い方法を変更する
          </button>
        </div>
      </section>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button onClick={handleSubmit} className="w-full bg-orange-400 text-white font-bold py-3 rounded-xl hover:bg-orange-500 transition">
        注文を確定する
      </button>

      {isPaymentModalOpen && (
        // ✅ SquarePayment の props: setPayments (Payment[] 用 dispatch)
        <SquarePayment
          setPayments={setPaymentList}
          id={selectCard}
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          openMode="card"
        />
      )}
    </div>
  );
};

export default Checkout;