import { Routes, Route } from 'react-router-dom';
import { useEffect } from "react";

import './css/App.css'

import { initAuthOnce } from "./conf/api";

import RequireAuth from "./component/RequireAuth";

import Home from './page/Home'
import SignUp from './page/SignUp';
import SignUpComplete from './page/SignUpComplete';
import RegisterConfirm from './page/RegisterConfirm';
import Login from './page/Login';
//import PaymentForm from './page/PaymentForm';
//import PaymentComplete from './page/PaymentComplete';
import MyPage from './page/MyPage';
//import PaymentList from './page/PaymentList';
import List from './page/List';
import EditProfile from './page/EditProfile';
import Profile from './page/Profile';
import AddressList from './page/AddressList';
import Item from './page/Item';
import FleaMarketItem from './page/flea_market/FleaMarketItem';
import Cart from './page/Cart';
import NotFound from './page/NotFound';
import Contact from './page/Contact';
import Checkout from './page/Checkout';
import SelectAddress from "./page/SelectAddres";
import SelectPayment from "./page/SelectPayment";
import CheckoutComplete from "./page/CheckoutComplete";
import FleaItemCreatePage from './page/flea_market/FleaItemCreatePage';
import FleaMarketList from './page/flea_market/FleaMarketList';
import FleaMarketCheckout from './page/flea_market/FleaMarketCheckout';
import FleaMarketTransactions from './page/flea_market/FleaMarketTransactions';
import SalesHistoryPage from './page/SalesHistory';


const App: React.FC = () => {
  useEffect(() => {
    (async () => {
      await initAuthOnce();
    })();
  }, []);
  return (
    <>
      <Routes>
        {/* public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signup/complete" element={<SignUpComplete />} />
        <Route path="/register/confirm" element={<RegisterConfirm />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />

        {/* protected */}
        <Route path="/mypage" element={<RequireAuth><MyPage /></RequireAuth>} />
        <Route path="/address/list" element={<RequireAuth><AddressList /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/profile/edit" element={<RequireAuth><EditProfile /></RequireAuth>} />
        <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
        <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
        <Route path="/checkout/address" element={<RequireAuth><SelectAddress /></RequireAuth>} />
        <Route path="/checkout/payment" element={<RequireAuth><SelectPayment /></RequireAuth>} />
        <Route path="/checkout/complete" element={<RequireAuth><CheckoutComplete /></RequireAuth>} />

        <Route path="/flea-market/list" element={<RequireAuth><FleaMarketList /></RequireAuth>} />
        <Route path="/flea-market/item/:id" element={<RequireAuth><FleaMarketItem /></RequireAuth>} />
        <Route path="/flea-market/sell/create" element={<RequireAuth><FleaItemCreatePage /></RequireAuth>} />
        <Route path="/flea-market/checkout/:id" element={<RequireAuth><FleaMarketCheckout /></RequireAuth>} />
        <Route path="/flea-market/checkout/address" element={<RequireAuth><SelectAddress /></RequireAuth>} />
        <Route path="/flea-market/checkout/payment" element={<RequireAuth><SelectPayment /></RequireAuth>} />
        <Route path="/flea-market/checkout/complete" element={<RequireAuth><CheckoutComplete /></RequireAuth>} />
        <Route path="/flea-market/transactions/:id" element={<RequireAuth><FleaMarketTransactions /></RequireAuth>} />

        <Route path="/flea-market/mypage/sales" element={<RequireAuth><SalesHistoryPage /></RequireAuth>} />

        {/* list/item を公開にするかは方針次第 */}
        <Route path="/list" element={<List />} />
        <Route path="/item/:id" element={<Item />} />
      </Routes>
    </>
  )
}

export default App
