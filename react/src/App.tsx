import { Routes, Route } from 'react-router-dom';
import { useEffect } from "react";

import './css/App.css'

import { initAuthOnce } from "./conf/api";

import RequireAuth from "./context/RequireAuth";

import Home from './page/Home'
import SignUp from './page/SignUp';
import SignUpComplete from './page/SignUpComplete';
import RegisterConfirm from './page/RegisterConfirm';
import Login from './page/Login';
//import PaymentForm from './page/PaymentForm';
//import PaymentComplete from './page/PaymentComplete';
import MyPage from './page/mypage/MyPage';
//import PaymentList from './page/PaymentList';
import List from './page/List';
import EditProfile from './page/mypage/EditProfile';
import Profile from './page/mypage/Profile';
import AddressList from './page/mypage/AddressList';
import Item from './page/Item';
import FleaMarketItem from './page/flea_market/FleaMarketItem';
import Cart from './page/Cart';
import NotFound from './page/NotFound';
import Contact from './page/Contact';
import Checkout from './page/Checkout';
import SelectAddress from "./page/SelectAddres";
import SelectPayment from "./page/SelectPayment";
import CheckoutComplete from "./page/CheckoutComplete";
import ContactForm from "./page/ContactForm";

import FleaItemCreatePage from './page/flea_market/FleaItemCreatePage';
import FleaMarketList from './page/flea_market/FleaMarketList';
import FleaMarketCheckout from './page/flea_market/FleaMarketCheckout';
import FleaMarketTransactions from './page/flea_market/FleaMarketTransactions';
import FleaItemEdit from './page/flea_market/FleaItemEdit';

import SalesHistoryPage from './page/mypage/SalesHistory';
import PaymentList from './page/mypage/PaymentList';
import DraftListPage from './page/DraftList';
import SellingListPage from './page/mypage/SellingList';
import UserProfile from './page/UserProfile';
import ActiveTransactionListPage from './page/mypage/ActiveTransactionListPage';
import RequestListPage from './page/mypage/RequestListPage';
import LikeListPage from './page/mypage/LikeListPage';
import HistoryPage from './page/mypage/HistoryPage';
import { AuthProvider } from './context/AuthContext';
import PointHistoryPage from './page/mypage/PointHistoryPage';
import BankAccount from './page/mypage/BankAccount';
import Settings from './page/mypage/Settings';
import IdentityVerificationPage from './page/mypage/IdentityVerification';
import ToastProvider from './component/ToastProvider';
import SMSVerification from './page/mypage/SMSVerification';
import EmailChange from './page/mypage/EmailChange';
import PasswordReset from './page/PasswordReset';
import PasswordResetRequest from './page/PasswordResetRequest';
import PasswordResetExecute from './page/PasswordResetExecute';
import BlockedList from './page/mypage/BlockedList';



const App: React.FC = () => {
  useEffect(() => {
    (async () => {
      await initAuthOnce();
    })();
  }, []);
  return (
    <>
      <AuthProvider>
        <Routes>
          {/* public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signup/complete" element={<SignUpComplete />} />
          <Route path="/register/confirm" element={<RegisterConfirm />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/contact/form" element={<ContactForm />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/user/profile/:id" element={<RequireAuth><UserProfile /></RequireAuth>} />
          <Route path="/user/:username" element={<RequireAuth><UserProfile /></RequireAuth>} />

          {/* protected */}
          <Route path="/cart" element={<Cart />} />

          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/checkout/address" element={<RequireAuth><SelectAddress /></RequireAuth>} />
          <Route path="/checkout/payment" element={<RequireAuth><SelectPayment /></RequireAuth>} />
          <Route path="/checkout/complete" element={<RequireAuth><CheckoutComplete /></RequireAuth>} />

          <Route path="/password-reset" element={<PasswordResetRequest />} />
          <Route path="/reset-password" element={<PasswordResetExecute />} />

          <Route path="/flea-market/list" element={<FleaMarketList />} />
          <Route path="/flea-market/item/:id" element={<FleaMarketItem />} />
          <Route path="/flea-market/item/edit/:id" element={<RequireAuth><ToastProvider><FleaItemEdit /></ToastProvider></RequireAuth>} />
          <Route path="/flea-market/sell/create" element={<RequireAuth><ToastProvider><FleaItemCreatePage /></ToastProvider></RequireAuth>} />
          <Route path="/flea-market/sell/create/:id" element={<RequireAuth><ToastProvider><FleaItemCreatePage /></ToastProvider></RequireAuth>} />
          <Route path="/flea-market/checkout/:id" element={<RequireAuth><FleaMarketCheckout /></RequireAuth>} />
          <Route path="/flea-market/checkout/address" element={<RequireAuth><SelectAddress /></RequireAuth>} />
          <Route path="/flea-market/checkout/payment" element={<RequireAuth><SelectPayment /></RequireAuth>} />
          <Route path="/flea-market/checkout/complete" element={<RequireAuth><CheckoutComplete /></RequireAuth>} />
          <Route path="/flea-market/transactions/:id" element={<RequireAuth><FleaMarketTransactions /></RequireAuth>} />

          <Route path="/mypage" element={<RequireAuth><MyPage /></RequireAuth>} />
          <Route path="/mypage/address" element={<RequireAuth><AddressList /></RequireAuth>} />
          <Route path="/mypage/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/mypage/profile/edit" element={<RequireAuth><EditProfile /></RequireAuth>} />
          <Route path="/mypage/sales" element={<RequireAuth><ToastProvider><SalesHistoryPage /></ToastProvider></RequireAuth>} />
          <Route path="/mypage/points" element={<RequireAuth><PointHistoryPage /></RequireAuth>} />
          <Route path="/mypage/payment" element={<RequireAuth><PaymentList /></RequireAuth>} />
          <Route path="/mypage/selling/list" element={<RequireAuth><ToastProvider><SellingListPage /></ToastProvider></RequireAuth>} />
          <Route path="/mypage/drafts/list" element={<RequireAuth><DraftListPage /></RequireAuth>} />
          <Route path="/mypage/requests" element={<RequireAuth><RequestListPage /></RequireAuth>} />
          <Route path="/mypage/transactions/active" element={<RequireAuth><ActiveTransactionListPage /></RequireAuth>} />
          <Route path="/mypage/likes" element={<RequireAuth><LikeListPage /></RequireAuth>} />
          <Route path="/mypage/transactions/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
          <Route path="/mypage/bank-account" element={<RequireAuth><ToastProvider><BankAccount /></ToastProvider></RequireAuth>} />
          <Route path="/mypage/password" element={<RequireAuth><PasswordReset /></RequireAuth>} />
          <Route path="/mypage/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/mypage/settings/identity" element={<RequireAuth><ToastProvider><IdentityVerificationPage /></ToastProvider></RequireAuth>} />
          <Route path="/mypage/settings/phone" element={<RequireAuth><ToastProvider><SMSVerification /></ToastProvider></RequireAuth>} />
          <Route path="/mypage/settings/email" element={<RequireAuth><ToastProvider><EmailChange /></ToastProvider></RequireAuth>} />
          <Route path="/mypage/settings/blocked" element={<RequireAuth><BlockedList /></RequireAuth>} />

          {/* list/item を公開にするかは方針次第 */}
          <Route path="/list" element={<List />} />
          <Route path="/item/:id" element={<Item />} />
        </Routes>
      </AuthProvider>
    </>
  )
}

export default App
