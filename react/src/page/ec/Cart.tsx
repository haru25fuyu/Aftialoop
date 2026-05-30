import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Header } from '../../component/Header';
import { Content } from '../../types/Content';
import { ContentsList } from '../../component/ContentsList';
import { CartContent } from '../../component/Content';

import api, { getAccessToken } from '../../conf/api';

import { s } from '../../styles/page/ec/Cart.styles';

// Content型を拡張（カート専用フィールド追加）
type CartItem = Content & { is_selected?: boolean };

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>(JSON.parse(localStorage.getItem('cart') || '[]'));
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [point, setPoint] = useState(0);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) setCart(JSON.parse(storedCart));
    } else {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        const localCart: CartItem[] = JSON.parse(storedCart);
        api.post('/cart/add', localCart).then(() => localStorage.removeItem('cart')).catch(console.error);
        setCart(localCart);
      }
      api.post('/cart').then((res) => {
        if (res.data) { setCart(res.data.cart || []); setPoint(res.data.point); localStorage.removeItem('cart'); }
      }).catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (!cart || cart.length === 0) return;
    setTotalPrice(cart.filter(i => i.is_selected).reduce((acc, i) => acc + (Number(i.price) || 0) * (i.quantity ?? 1), 0));
    setTotalPoints(cart.filter(i => i.is_selected).reduce((acc, i) => acc + (Number(i.point) || 0) * (i.quantity ?? 1), 0));
  }, [cart]);

  const handleQuantityChange = (item: CartItem) => {
    if (!item || !item.id) return;
    api.post('/cart/edit', item).then((res) => setCart(res.data || [])).catch(console.error);
  };

  const onSubmit = async () => {
    const selectedItems = cart.filter(item => item.is_selected);
    localStorage.setItem('checkout', JSON.stringify(selectedItems));
    localStorage.removeItem('cart');
    navigate('/checkout');
  };

  return (
    <div>
      <header style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 50, backgroundColor: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
        <Header />
      </header>
      <div style={{ position: "fixed", top: 64, width: "100%", zIndex: 40, backgroundColor: "#fff", borderBottom: "1px solid #e0ddd8", padding: "12px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <h2 style={s.title}>買い物かご</h2>
      </div>
      <main style={{ paddingTop: 128, paddingBottom: 220, width: "100%", maxWidth: 720, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }}>
        <ContentsList
          contents={cart}
          Component={(props) => <CartContent {...props} function={handleQuantityChange} />}
          slider={false}
          vertical={false}
          show_num={1}
        />
      </main>
      <div style={s.footer}>
        <div style={{ textAlign: "center" }}>
          <p style={s.footerText}>合計金額: ¥{totalPrice.toLocaleString()}</p>
          <p style={s.footerText}>合計ポイント: {totalPoints.toLocaleString()}pt</p>
          <p style={s.footerSub}>所持ポイント: {point.toLocaleString()}pt</p>
        </div>
        <button type="button" onClick={onSubmit} style={s.checkoutBtn}>
          購入手続きへ進む
        </button>
      </div>
    </div>
  );
};

export default Cart;