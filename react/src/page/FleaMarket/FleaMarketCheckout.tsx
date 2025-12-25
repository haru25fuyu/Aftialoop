import React, { useState, useEffect } from "react";
import { useNavigate, Link, useParams, useLocation } from "react-router-dom";

import { Address, fleaContent, Payment } from "../../types/Content";
import { Customer } from "../../types/Content";

import api from "../../conf/api";
import { chargeCard, chargePoint } from "../../conf/function";
import { CONFIG } from "../../conf/config";

import LoginModal from "../../modal/Login";
import SquarePayment from "../../modal/EditPayment";

const FleaMarketCheckout: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  // quantity は state から。無い場合は 1
  const quantityFromState = (location.state as any)?.quantity;
  const [quantity, setQuantity] = useState<number>(Number(quantityFromState) || 1);

  const [paymentMethod, setPaymentMethod] = useState("point");
  const [error, setError] = useState("");
  const [item, setItem] = useState<fleaContent | null>(null); // 単一商品
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [paymentList, setPaymentList] = useState<Payment[]>([]);
  const [selectCard, setSelectCard] = useState<string>("");
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [pointMode, setPointMode] = useState<"full" | "partial" | "none">("full");
  const [usePoints, setUsePoints] = useState(0);
  const customerPoint = customer?.point ?? 0;
  const maxUsablePoints = Math.min(customerPoint, totalPrice);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleLoginSuccess = () => setReloadTrigger((prev) => prev + 1);

  const fetchAddress = async (id: string) => {
    try {
      const response = await api.post(`/address/get`, { id });
      setAddress(response.data || null);
    } catch (e) {
      console.error("住所情報の取得に失敗しました:", e);
    }
  };

  const fetchPaymentList = async () => {
    api
      .post("/card/list")
      .then((res) => setPaymentList(res.data.card))
      .catch((err) => console.error(err));
  };

  // ✅ 商品を itemId から取得
  const fetchItem = async (id: string) => {
    try {
      // ここはあなたのAPIに合わせて変更してOK
      // 例: /flea-market/item/get でも /flea-market/item でも
      const res = await api.get(`/flea-market/item/${id}`);

      const fetched: fleaContent = res.data.item ?? res.data; // レスポンス形に合わせて調整
      if (!fetched) throw new Error("Item not found");

      // quantity を注入（UIや計算で使う）
      setItem(res.data.item);
    } catch (e) {
      console.error("商品取得に失敗:", e);
      navigate("/flea-market"); // もしくは404へ
    }
  };

  useEffect(() => {
    console.log("itemId:", id);
    if (!id) {

      return;
    }

    fetchItem(id);

    api.post("customer")
      .then((res) => {
        if (!res.data.user) {
          setCustomer(null);
          setLoginModalOpen(true);
          return;
        }

        setCustomer(res.data.user);

        const selectedAddress = localStorage.getItem("selectedAddress");
        if (selectedAddress) {
          const addressData: Address = JSON.parse(selectedAddress);
          setAddress(addressData);
          localStorage.removeItem("selectedAddress");
        } else if (res.data.user.defaultAddress) {
          fetchAddress(res.data.user.defaultAddress);
        } else {
          setAddress(null);
        }

        setSelectCard(res.data.user.defaultCard || "");
        fetchPaymentList();
      })
      .catch((err) => {
        setCustomer(null);
        setLoginModalOpen(true);
        console.error(err);
      });
  }, [id, reloadTrigger]); // ← itemId と reloadTrigger

  // ✅ 合計計算（単一商品）
  useEffect(() => {
    if (!item) return;

    const qty = item.quantity ?? quantity ?? 1;
    const price = Number(item.price) || 0;
    const point = Number(item.point) || 0;

    setTotalPrice(price * qty);
    setTotalPoints(point * qty);
  }, [item, quantity]);

  const canUsePoints = typeof customer?.point === "number" && customer.point >= totalPoints;

  const funcSelectCard = (cardID: string) => {
    setPaymentMethod(`credit${cardID}`);
    setSelectCard(cardID);
  };

  const handleSubmit = async () => {
    setError("");

    if (!item) return setError("商品情報が取得できていません。");
    if (!address?.ID) return setError("お届け先住所を設定してください。");
    if (!customer?.id) {
      setLoginModalOpen(true);
      return;
    }

    const items = [{ ...item, quantity: item.quantity ?? quantity ?? 1 }];

    const customerPoint = customer?.point ?? 0;
    const maxUsablePoints = Math.min(customerPoint, totalPrice);
    const safeUsePoints =
      pointMode === "full" ? maxUsablePoints :
        pointMode === "none" ? 0 :
          Math.max(0, Math.min(usePoints, maxUsablePoints));

    const cardChargeAmount = Math.max(0, totalPrice - safeUsePoints);

    // カードが必要なのに未選択
    if ((pointMode === "partial" || pointMode === "none") && cardChargeAmount > 0 && !selectCard) {
      setError("クレジットカードを選択してください。");
      return;
    }

    try {
      // ✅ 理想はサーバー1回で「ポイント減算 + カード課金 + 注文確定」
      // でも既存関数が分かれている前提なら、最低限この順序にする
      // 1) カード課金（失敗したらポイント減らさない）
      if (cardChargeAmount > 0) {
        await chargeCard({
          price: cardChargeAmount,
          cardID: selectCard,
          customerID: customer.id,
          items,
          addressID: address.ID,
          // 余裕があれば: pointUsed: safeUsePoints を送ってサーバーで記録
        });
      }

      // 2) ポイント減算
      if (safeUsePoints > 0) {
        await chargePoint({
          price: safeUsePoints,
          cardID: "",
          customerID: customer.id,
          items,
          addressID: address.ID,
        });
      }

      navigate("/checkout/complete");
    } catch (e) {
      console.error("決済処理に失敗:", e);
      setError("決済処理に失敗しました。");
    }
  };


  // ---- UI部分は極力そのまま。item配列→単体に変更するだけ ----

  return (
    <>
      <header>
        <h1 className="text-2xl font-bold text-center my-4">購入確認</h1>
        <p className="text-center text-gray-600">購入内容を確認し、支払い方法を選択してください。</p>
      </header>

      <main className="max-w-full mx-auto p-0">
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold border-b pb-2 mb-2">🛍️ 購入内容</h2>
            <p>購入商品数: <span className="font-semibold">1点</span></p>
            <p>合計金額: <span className="text-blue-600 font-bold">¥{totalPrice.toLocaleString()}</span></p>
            <p>ポイント利用時: <span className="text-green-600 font-bold">{totalPoints.toLocaleString()}pt</span></p>
            <p>残りポイント: {customer?.point ? (customer.point - totalPoints).toLocaleString() : 0}pt</p>
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold border-b pb-2 mb-4">🛒 購入商品</h2>

            {!item ? (
              <p className="text-gray-500">商品情報を読み込み中...</p>
            ) : (
              <div className="flex items-center gap-4 border-b py-3">
                <img
                  src={CONFIG.BASE_URL + item.main_image_url}
                  alt={item.name}
                  className="w-16 h-16 object-contain rounded border"
                />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-gray-600">数量：{item.quantity ?? quantity}</p>
                </div>
                <div className="text-right text-sm font-semibold min-w-[80px]">
                  ¥{(Number(item.price) * (item.quantity ?? quantity)).toLocaleString()}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold border-b pb-2 mb-2">📍 お届け先</h2>
            <p>{address?.Name}</p>
            <p>{address?.PostCode}</p>
            <p>{address?.Address1} {address?.Address2} {address?.Address3}</p>
            <Link to={`/checkout/address`} className="text-blue-500 hover:underline text-sm">お届け先を変更する</Link>
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold border-b pb-2 mb-2">💳 支払い方法</h2>

            <div className="space-y-3">
              {/* ポイントの使い方 */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={pointMode === "full"}
                    onChange={() => setPointMode("full")}
                    className="mr-2"
                  />
                  全額ポイント（残高：{customerPoint.toLocaleString()}pt）
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={pointMode === "partial"}
                    onChange={() => setPointMode("partial")}
                    className="mr-2"
                  />
                  一部ポイント＋クレジットカード
                </label>

                {pointMode === "partial" && (
                  <div className="ml-6 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap">使うポイント</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="border rounded px-2 py-1 w-32"
                        value={usePoints}
                        min={0}
                        max={maxUsablePoints}
                        onChange={(e) => setUsePoints(Number(e.target.value) || 0)}
                      />
                      <span>pt</span>

                      <button
                        type="button"
                        className="text-blue-500 hover:underline"
                        onClick={() => setUsePoints(maxUsablePoints)}
                      >
                        最大
                      </button>
                    </div>

                    <p className="text-gray-600">
                      ポイント上限：{maxUsablePoints.toLocaleString()}pt（残高と請求額の小さい方）
                    </p>
                  </div>
                )}

                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={pointMode === "none"}
                    onChange={() => setPointMode("none")}
                    className="mr-2"
                  />
                  ポイントを使わずクレジットカード
                </label>
              </div>

              <hr className="my-4 border-t border-gray-300" />

              {/* クレカ選択（pointMode が full じゃない時だけ必要） */}
              {(pointMode === "partial" || pointMode === "none") && (
                <>
                  {paymentList
                    ?.slice()
                    .sort((a, b) => {
                      if (a.ID === customer?.defaultCard) return -1;
                      if (b.ID === customer?.defaultCard) return 1;
                      return 0;
                    })
                    .map((p) => (
                      <React.Fragment key={p.ID}>
                        <label className="flex items-center mb-2">
                          <input
                            type="radio"
                            value={`credit${p.ID}`}
                            checked={selectCard === p.ID}
                            onChange={() => funcSelectCard(p.ID)}
                            className="mr-2"
                          />
                          クレジットカード（{p.CardBrand}**** {p.Last4}）
                          <span className="text-sm text-gray-500 ml-2">
                            有効期限: {p.ExpMonth}/{p.ExpYear}
                          </span>
                        </label>
                        <hr className="my-4 border-t border-gray-300" />
                      </React.Fragment>
                    ))}

                  <a onClick={() => setIsPaymentModalOpen(true)} className="text-blue-500 hover:underline text-sm">
                    支払い方法を変更する
                  </a>
                </>
              )}
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md text-center space-y-4">
            <p className="text-gray-700">
              {paymentMethod === "point"
                ? `小計：${totalPoints.toLocaleString()}pt`
                : `小計：¥${totalPrice.toLocaleString()}`}
            </p>

            <span>残りポイント：{((customer?.point ?? 0) - totalPoints).toLocaleString()}pt</span>

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

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        showCloseButton={true}
      />

      {isPaymentModalOpen && (
        <SquarePayment
          setPayments={setPaymentList}
          id={""}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setReloadTrigger((prev) => prev + 1);
            setIsPaymentModalOpen(false);
          }}
          openMode={"card"}
        />
      )}
    </>
  );
};

export default FleaMarketCheckout;
