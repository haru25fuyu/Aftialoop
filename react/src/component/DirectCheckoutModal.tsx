import React, { useState, useEffect } from "react";

import { Content, Customer } from "../types/Content";
import { Address } from "../types/Address";      // ✅ 正しいインポート元
import { Payment } from "../types/Payment";      // ✅ 正しいインポート元

import api from "../conf/api";
import LoginModal from "../modal/Login";
import SuccessCheckout from "../modal/SuccessCheckout";
import { chargeCard, chargePoint } from "../conf/function";

interface DirectCheckoutModalProps {
  item: Content;
  isOpen: boolean;
  quantity?: number;
  onClose: () => void;
}

const DirectCheckoutModal: React.FC<DirectCheckoutModalProps> = ({
  item,
  isOpen,
  onClose,
  quantity,
}) => {
  const [paymentMethod, setPaymentMethod] = useState("point");
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [defaultCard, setDefaultCard] = useState<Payment | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [address, setAddress] = useState<Address | null>(null);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLoginSuccess = () => setReloadTrigger((prev) => prev + 1);

  const fetchAddressData = async (id: string) => {
    if (!id) return;
    try {
      const res = await api.post(`/address/get`, { id });
      setAddress(res.data || null);
    } catch {
      // 住所未設定の場合は無視
    }
  };

  const fetchDefaultCard = async (cardId: string) => {
    if (!cardId) return;
    try {
      const res = await api.post(`/card/get`, { cardID: cardId });
      setDefaultCard(res.data.card || null);
    } catch {
      // カード未設定の場合は無視
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const fetchUserData = async () => {
      try {
        const res = await api.post("customer");
        if (!res.data.user?.id) { setLoginModalOpen(true); return; }

        setCustomer(res.data.user);
        // ✅ default_card (snake_case) — バックエンドの JSON キーに合わせる
        await fetchAddressData(res.data.address);
        await fetchDefaultCard(res.data.user.default_card);
      } catch {
        setLoginModalOpen(true);
      }
    };

    fetchUserData();
  }, [isOpen, reloadTrigger]);

  if (!isOpen) return null;

  const price = item.price;
  const customerPoint = customer?.point || 0;
  const canUsePoints = customerPoint >= item.point * (quantity || 1);

  const handleSubmit = async () => {
    setError("");
    try {
      if (paymentMethod === "point") {
        if (!canUsePoints) { setError("ポイント残高が不足しています。"); return; }
        await chargePoint({
          price,
          cardID: "",
          customerID: customer?.id || "",
          items: [item],
          addressID: address?.id || "",
        });
      } else {
        await chargeCard({
          price,
          cardID: defaultCard?.id || "",
          customerID: customer?.id || "",
          items: [item],
          addressID: address?.id || "",
        });
      }
      setIsSuccess(true);
    } catch {
      setError("決済処理に失敗しました。");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md">
        {isSuccess ? (
          <>
            <button onClick={onClose} className="absolute text-gray-500 hover:text-gray-700">閉じる</button>
            <SuccessCheckout />
          </>
        ) : (
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
              {/* ✅ Address 型は snake_case (name, post_code, address1...) */}
              <p>{address?.name}</p>
              <p>{address?.post_code}</p>
              <p>{address?.address1} {address?.address2} {address?.address3}</p>
            </section>

            <section className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="font-semibold">💳 支払い方法</h3>
              <label className="block">
                <input type="radio" value="credit" checked={paymentMethod === "credit"} onChange={() => setPaymentMethod("credit")} className="mr-2" />
                {/* ✅ Payment 型は camelCase (cardBrand, last4...) */}
                クレジットカード（{defaultCard?.cardBrand || ""} **** {defaultCard?.last4 || ""}）
              </label>
              <label className="block">
                <input type="radio" value="point" checked={paymentMethod === "point"} onChange={() => setPaymentMethod("point")} className="mr-2" />
                ポイントで支払う（残高：{customer?.point || 0}pt）
              </label>
            </section>

            <div className="mb-4">
              <p className="font-semibold">
                {paymentMethod === "point" ? `使用ポイント：${price.toLocaleString()}pt` : `合計金額：¥${price.toLocaleString()}`}
              </p>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>

            <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              購入を確定する
            </button>
            <button onClick={onClose} className="mt-2 text-sm text-gray-500 underline block">
              キャンセル
            </button>
          </>
        )}

        {isLoginModalOpen && (
          <LoginModal isOpen={isLoginModalOpen} onClose={() => { setLoginModalOpen(false); onClose(); }} onLoginSuccess={handleLoginSuccess} showCloseButton={true} />
        )}
      </div>
    </div>
  );
};

export default DirectCheckoutModal;