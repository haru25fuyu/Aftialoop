import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { Address, FleaContent, Payment } from "../../types/Content";
import { Customer } from "../../types/Content";

import api from "../../conf/api";
import { fleaCheckout } from "../../conf/function";
import { CONFIG } from "../../conf/config";

import LoginModal from "../../modal/Login";
import SquarePayment from "../../modal/EditPayment";
import SelectAddressModal from "../../modal/SelectAddressModal";

import { fetchAddress } from "../../conf/function";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const yenFloor = (n: number) => Math.floor(n);
const yenCeil = (n: number) => Math.ceil(n);

const FleaMarketCheckout: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const quantityFromState = (location.state as any)?.quantity;
  const [quantity] = useState<number>(Number(quantityFromState) || 1);

  const [error, setError] = useState("");
  const [item, setItem] = useState<FleaContent | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [address, setAddress] = useState<Address | null>(null);

  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [paymentList, setPaymentList] = useState<Payment[]>([]);
  const [selectCard, setSelectCard] = useState<string>("");

  const [isLoginModalOpen, setLoginModalOpen] = useState(false);

  const [pointMode, setPointMode] = useState<"full" | "partial" | "none">("full");
  const [usePoints, setUsePoints] = useState(0);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleLoginSuccess = () => setReloadTrigger((prev) => prev + 1);

  const [isAddressOpen, setIsAddressOpen] = React.useState(false);


  const fetchPaymentList = async () => {
    api
      .post("/card/list")
      .then((res) => setPaymentList(res.data.card))
      .catch((err) => console.error(err));
  };

  const fetchItem = async (id: string) => {
    try {
      const res = await api.get(`/flea-market/item/${id}`);
      const fetched: FleaContent = res.data.item ?? res.data;
      if (!fetched) throw new Error("Item not found");
      setItem(res.data.item ?? fetched);
    } catch (e) {
      console.error("商品取得に失敗:", e);
      navigate("/flea-market");
    }
  };

  useEffect(() => {
    if (!id) return;

    fetchItem(id);

    api
      .post("customer")
      .then((res) => {
        if (!res.data.user) {
          setCustomer(null);
          setLoginModalOpen(true);
          return;
        }

        setCustomer(res.data.user);
        (async () => {
          setAddress(await fetchAddress(res.data.user.id || ""));
        })();

        setSelectCard(res.data.user.defaultCard || "");
        fetchPaymentList();
      })
      .catch((err) => {
        setCustomer(null);
        setLoginModalOpen(true);
        console.error(err);
      });
  }, [id, reloadTrigger]);

  /**
   * ✅ ここが全部：SellerRate + ポイント + 割引（現金部分のみ） + カード請求
   */
  const computed = useMemo(() => {
    const qty = item?.quantity ?? quantity ?? 1;
    const unitPrice = toNum(item?.price);
    const baseTotalYen = yenFloor(unitPrice * qty);

    const customerPoint = toNum(customer?.point);

    // ✅ SellerRate（1ptが何円相当か）
    // フィールド名は実プロジェクトに合わせて1つに統一推奨
    const rawSellerRate =
      toNum((item as any)?.SellerRate) ||
      toNum((item as any)?.sellerRate) ||
      toNum((item as any)?.seller_rate) ||
      toNum((item as any)?.seller_rate_value) ||
      1;

    const sellerRate = Math.max(0.000001, rawSellerRate);

    // ✅ 出品者追加割引率（%）
    const rawDiscountRate =
      toNum((item as any)?.seller_discount_rate) ||
      toNum((item as any)?.additional_discount_rate) ||
      toNum((item as any)?.discount_rate) ||
      0;

    const sellerDiscountRate = clamp(rawDiscountRate, 0, 100);

    // 円→必要ポイント（全額ポイントにするなら）
    const yenToPoints = (yen: number) => yenCeil(yen / sellerRate);

    // pt→円（ポイントで充当できる円）
    const pointsToYen = (pt: number) => yenFloor(pt * sellerRate);

    const requiredPointsFull = yenToPoints(baseTotalYen);

    // 使えるポイント上限（pt）：残高と必要ptの小さい方
    const maxUsablePoints = Math.min(customerPoint, requiredPointsFull);

    const safeUsePoints =
      pointMode === "full"
        ? maxUsablePoints
        : pointMode === "none"
          ? 0
          : clamp(toNum(usePoints), 0, maxUsablePoints);

    // ポイントで充当できた円
    const coveredYenByPoints = Math.min(baseTotalYen, pointsToYen(safeUsePoints));

    // 現金部分（割引前）
    const cashBeforeDiscount = Math.max(0, baseTotalYen - coveredYenByPoints);

    // ✅ 割引は現金部分にのみ適用
    const discountAmountYen = yenFloor((cashBeforeDiscount * sellerDiscountRate) / 100);

    // ✅ カード請求額（割引後）
    const cardChargeAmountYen = Math.max(0, cashBeforeDiscount - discountAmountYen);

    const remainingPoints = Math.max(0, customerPoint - safeUsePoints);

    // 表示用：実質支払（ポイントを円換算して足す）
    const effectivePaidYen = coveredYenByPoints + cardChargeAmountYen;

    const bonusYen = Math.max(
      0,
      yenFloor(safeUsePoints * sellerRate) - safeUsePoints
    );

    return {
      qty,
      unitPrice,
      baseTotalYen,

      sellerRate,
      sellerDiscountRate,

      customerPoint,
      requiredPointsFull,
      maxUsablePoints,
      safeUsePoints,

      coveredYenByPoints,
      cashBeforeDiscount,
      discountAmountYen,
      cardChargeAmountYen,

      remainingPoints,
      effectivePaidYen,

      yenToPoints,
      pointsToYen,
      bonusYen,
    };
  }, [item, quantity, customer?.point, pointMode, usePoints]);

  // ✅ pointMode 切替時の usePoints 初期化（partialに入ったら最大を入れる）
  useEffect(() => {
    if (pointMode === "partial") {
      setUsePoints(computed.maxUsablePoints);
    } else {
      setUsePoints(0);
    }
  }, [pointMode, computed.maxUsablePoints]);

  const handleSubmit = async () => {
    setError("");

    if (!item) return setError("商品情報が取得できていません。");
    if (!address?.ID) return setError("お届け先住所を設定してください。");
    if (!customer?.id) {
      setLoginModalOpen(true);
      return;
    }

    const items = [{ ...item, quantity: item.quantity ?? quantity ?? 1 }];

    const cardChargeAmount = computed.cardChargeAmountYen;

    // カードが必要なのに未選択
    if ((pointMode === "partial" || pointMode === "none") && cardChargeAmount > 0 && !selectCard) {
      setError("クレジットカードを選択してください。");
      return;
    }

    try {
      // 1) カード課金（失敗したらポイント減らさない）
      if (cardChargeAmount > 0) {
        await fleaCheckout({
          price: cardChargeAmount,
          cardID: selectCard,
          customerID: customer.id,
          items: items,
          addressID: address.ID,
        });
      }

      navigate("/checkout/complete");
    } catch (e) {
      console.error("決済処理に失敗:", e);
      setError("決済処理に失敗しました。");
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
          <section className="bg-white p-6 shadow-md sticky top-0 z-30">
            <h2 className="text-xl font-bold border-b pb-2 mb-3">🛍️ 購入内容</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-baseline">
                <span className="text-gray-600">お支払い</span>
                <span className="text-blue-600 font-bold text-lg">
                  ¥{computed.cardChargeAmountYen.toLocaleString()}
                </span>
              </div>

              {computed.bonusYen > 0 && (
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-600">割引</span>
                  <span className="text-green-600 font-bold">
                    -¥{computed.bonusYen.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-baseline">
                <span className="text-gray-600">使うポイント</span>
                <span className="font-semibold">
                  {computed.safeUsePoints.toLocaleString()}pt
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-gray-600">残りポイント</span>
                <span className="font-semibold">
                  {computed.remainingPoints.toLocaleString()}pt
                </span>
              </div>
            </div>
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
                  <p className="text-gray-600">数量：{computed.qty}</p>
                </div>
                <div className="text-right text-sm font-semibold min-w-[80px]">
                  ¥{computed.baseTotalYen.toLocaleString()}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold border-b pb-2 mb-2">📍 お届け先</h2>
            <p>{address?.Name}</p>
            <p>{address?.PostCode}</p>
            <p>
              {address?.Address1} {address?.Address2} {address?.Address3}
            </p>
            <button
              className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
              onClick={() => setIsAddressOpen(true)}
            >
              お届け先を選ぶ
            </button>

            <SelectAddressModal
              isOpen={isAddressOpen}
              onClose={() => setIsAddressOpen(false)}
              onSelect={(addr) => setAddress(addr)}
            />

          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold border-b pb-2 mb-2">💳 支払い方法</h2>

            {/* ポイント/カードの選択 */}
            <div className="space-y-3">
              {/* 全額ポイント（可能な時だけ表示） */}
              {item?.price && item.price <= computed.customerPoint && (
                <label
                  className={[
                    "block cursor-pointer rounded-lg border p-4 transition",
                    pointMode === "full" ? "border-blue-600 ring-2 ring-blue-100" : "hover:bg-gray-50",
                  ].join(" ")}
                  onClick={() => setPointMode("full")}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={pointMode === "full"}
                      onChange={() => setPointMode("full")}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">全額ポイントで支払う</div>
                      <div className="text-sm text-gray-600">
                        残高：{computed.customerPoint.toLocaleString()}pt
                      </div>
                    </div>
                  </div>
                </label>
              )}

              {/* 一部ポイント＋カード */}
              <label
                className={[
                  "block cursor-pointer rounded-lg border p-4 transition",
                  pointMode === "partial" ? "border-blue-600 ring-2 ring-blue-100" : "hover:bg-gray-50",
                ].join(" ")}
                onClick={() => setPointMode("partial")}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={pointMode === "partial"}
                    onChange={() => setPointMode("partial")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">ポイント＋クレジットカード</div>
                    <div className="text-sm text-gray-600">
                      上限：{computed.maxUsablePoints.toLocaleString()}pt
                      <span className="text-gray-400">（残高と必要ptの小さい方）</span>
                    </div>

                    {pointMode === "partial" && (
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm whitespace-nowrap">使うポイント</span>

                          <input
                            type="number"
                            inputMode="numeric"
                            className="border rounded px-2 py-1 w-32"
                            value={usePoints}
                            min={0}
                            max={computed.maxUsablePoints}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={() => {
                              // 入力後に丸めて事故防止
                              setUsePoints(clamp(toNum(usePoints), 0, computed.maxUsablePoints));
                            }}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              setUsePoints(Number.isFinite(n) ? n : 0);
                            }}
                          />

                          <span className="text-sm">pt</span>

                          <button
                            type="button"
                            className="text-sm text-blue-600 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUsePoints(computed.maxUsablePoints);
                            }}
                          >
                            最大
                          </button>
                        </div>

                        <div className="text-sm text-gray-700 space-y-1">
                          <div>
                            ポイント：{computed.safeUsePoints.toLocaleString()}pt（¥{computed.coveredYenByPoints.toLocaleString()}相当）
                          </div>
                          <div>
                            カード：¥{computed.cardChargeAmountYen.toLocaleString()}
                            {computed.discountAmountYen > 0 && (
                              <span className="text-gray-500">（割引 -¥{computed.discountAmountYen.toLocaleString()} 済み）</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </label>

              {/* カードのみ */}
              <label
                className={[
                  "block cursor-pointer rounded-lg border p-4 transition",
                  pointMode === "none" ? "border-blue-600 ring-2 ring-blue-100" : "hover:bg-gray-50",
                ].join(" ")}
                onClick={() => setPointMode("none")}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={pointMode === "none"}
                    onChange={() => setPointMode("none")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">クレジットカードのみ</div>
                    <div className="text-sm text-gray-600">ポイントは使いません</div>
                  </div>
                </div>
              </label>
            </div>

            {/* どのカードを使うか（partial / none のときだけ表示。さらに請求0なら不要） */}
            {pointMode !== "full" && computed.cardChargeAmountYen > 0 && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">使用するカード</div>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    ＋カードを追加
                  </button>
                </div>

                {paymentList?.length ? (
                  <div className="space-y-2">
                    {paymentList.map((p) => (
                      <label
                        key={p.ID || p.id}
                        className={[
                          "block cursor-pointer rounded-lg border p-4 transition",
                          selectCard === (p.ID || p.id)
                            ? "border-blue-600 ring-2 ring-blue-100"
                            : "hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="card"
                            checked={selectCard === (p.ID || p.id)}
                            onChange={() => setSelectCard((p.ID || p.id) as string)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="font-semibold">
                              {(p.Brand || p.brand || "CARD")} •••• {(p.Last4 || p.last4 || "----")}
                            </div>
                            <div className="text-sm text-gray-600">
                              有効期限：{String(p.ExpMonth || p.expMonth || "").padStart(2, "0")}/{p.ExpYear || p.expYear || ""}
                              {customer?.defaultCard === (p.ID || p.id) && (
                                <span className="ml-2 text-xs text-gray-500">（既定）</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 border rounded p-4">
                    登録済みのカードがありません。
                    <button
                      type="button"
                      className="ml-2 text-blue-600 hover:underline"
                      onClick={() => setIsPaymentModalOpen(true)}
                    >
                      カードを追加
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>


          <section className="bg-white p-6 rounded-lg shadow-md text-center space-y-4">

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 w-full max-w-sm mx-auto"
              onClick={handleSubmit}
            >
              購入を確定する
            </button>
          </section>
        </div >
      </main >

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        showCloseButton={true}
      />

      {
        isPaymentModalOpen && (
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
        )
      }
    </>
  );
};

export default FleaMarketCheckout;
