import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { Header } from "../../component/Header";
import DirectCheckoutModal from "../../component/DirectCheckoutModal";
import BottomBarPortal from "../../component/BottomBarPortal";
import { CartAddBar } from "../../SnackBar/AddCart";

import { Content, itemImage } from "../../types/Content";

import api, { getAccessToken } from "../../conf/api";
import { hasAllFlags } from "../../conf/function";
import { ITEM__STATUS } from "../../conf/config";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import "swiper/swiper-bundle.css";

import { s } from "../../styles/page/ec/Item.styles";

const addLocalCart = (item: Content) => {
  const cart: Content[] = JSON.parse(localStorage.getItem("cart") || "[]");
  const idx = cart.findIndex((ci) => ci.id === item.id);
  if (!item.quantity) return;
  if (idx !== -1) { cart[idx].quantity = (cart[idx].quantity || 1) + item.quantity; }
  else { cart.push({ ...item, quantity: item.quantity }); }
  localStorage.setItem("cart", JSON.stringify(cart));
};

const Item: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Content | null>(null);
  const [images, setImages] = useState<itemImage[]>([]);
  const [selectQuantity, setSelectQuantity] = useState(1);
  const [orderFlag, setOrderFlag] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCartBar, setShowCartBar] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/item/get/${id}`).then((res) => {
      if (!res.data) return;
      setItem(res.data.item);
      setImages(res.data.images || []);
      setOrderFlag(hasAllFlags(res.data.item.status, [ITEM__STATUS.ACCEPTS_ORDER, ITEM__STATUS.HAS_RESTOCK]));
    }).catch(console.error);
  }, [id]);

  const validateStock = (): boolean => {
    if (!item) { alert("商品情報がありません"); return false; }
    if (selectQuantity <= 0) { alert("数量は1以上で入力してください。"); return false; }
    if (item.quantity <= 0 && !orderFlag) { alert("この商品は現在在庫がありません。"); return false; }
    if (item.quantity <= 0 && orderFlag) { return window.confirm("この商品はお取り寄せ対応です。\n発送までにお時間がかかる場合があります。\nキャンセルとなる可能性もあります。注文を続けますか？"); }
    if (item.quantity < selectQuantity) { alert(`在庫は ${item.quantity} 個です。`); return false; }
    return true;
  };

  const decrement = () => { if (selectQuantity > 1) setSelectQuantity((q) => q - 1); else alert("数量は1以上で入力してください。"); };
  const increment = () => { if (item && selectQuantity >= item.quantity) { alert(`在庫は ${item.quantity} 個です。`); return; } setSelectQuantity((q) => q + 1); };

  const AddCart = () => {
    if (!validateStock()) return;
    const token = getAccessToken();
    const addItem: Content = { ...item!, quantity: selectQuantity };
    if (!token || token === "undefined") { addLocalCart(addItem); }
    else { api.post("/cart/add", [addItem]).catch(() => addLocalCart(addItem)); }
    setShowCartBar(true);
  };

  const Purchase = () => { if (!validateStock()) return; setShowModal(true); };

  return (
    <div style={s.page}>
      <Header />
      {item ? (
        <main>
          <div style={s.imgWrap}>
            <Swiper modules={[Pagination, Navigation]} pagination={{ clickable: true }} navigation>
              {images.map((img) => (
                <SwiperSlide key={img.id}>
                  <img src={img.url} alt={item.name} style={s.img} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
          <div style={s.infoWrap}>
            <h1 style={s.title}>{item.name}</h1>
            <p style={s.price}>{item.price.toLocaleString()}円</p>
            <BottomBarPortal>
              <div style={s.bottomBar}>
                <div style={s.qtyRow}>
                  <button onClick={decrement} style={s.qtyBtn} aria-label="数量を減らす">－</button>
                  <span style={s.qtyValue}>{selectQuantity}</span>
                  <button onClick={increment} style={s.qtyBtn} aria-label="数量を増やす">＋</button>
                </div>
                <div style={s.btnRow}>
                  <button style={s.cartBtn} onClick={AddCart}>カートに入れる</button>
                  <button style={s.buyBtn} onClick={Purchase}>購入手続きへ</button>
                </div>
              </div>
            </BottomBarPortal>
            <div style={s.descCard}>
              <p style={s.descTitle}>📦 商品情報</p>
              <p style={s.desc}>{item.description}</p>
            </div>
          </div>
          <h2>レビュー</h2>
          <DirectCheckoutModal item={item} isOpen={showModal} quantity={selectQuantity} onClose={() => setShowModal(false)} />
        </main>
      ) : (
        <p>商品情報が取得できませんでした。</p>
      )}
      <CartAddBar visible={showCartBar} onClose={() => setShowCartBar(false)} onViewCart={() => (window.location.href = "/cart")} item={item} />
    </div>
  );
};

export default Item;
