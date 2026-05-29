import { Routes, Route, Navigate } from "react-router-dom";

import "./css/App.css";

import { AuthProvider } from "./context/AuthContext";
import RequireAuth from "./context/RequireAuth";
import ToastProvider from "./component/ToastProvider";

// ── ページ imports ────────────────────────────────────────
import Home from "./page/Home";
import Login from "./page/Login";
import SignUp from "./page/SignUp";
import SignUpComplete from "./page/SignUpComplete";
import RegisterConfirm from "./page/RegisterConfirm";
import Contact from "./page/Contact";
import ContactForm from "./page/ContactForm";
import ContactComplete from "./page/ContactComplete";
import TermsOfService from "./page/TermsOfService";
import PrivacyPolicy from "./page/PrivacyPolicy";
import UserGuide from "./page/user_guid/UserGuide";
import NotFound from "./page/NotFound";
import PasswordResetRequest from "./page/PasswordResetRequest";
import PasswordResetExecute from "./page/PasswordResetExecute";
import PasswordReset from "./page/PasswordReset";
import { SpecifiedCommercialTransaction } from "./page/SpecifiedCommercialTransaction";
import NotificationsPage from "./page/Notifications";

import MyPage from "./page/mypage/MyPage";
import Profile from "./page/mypage/Profile";
import EditProfile from "./page/mypage/EditProfile";
import AddressList from "./page/mypage/AddressList";
import PaymentList from "./page/mypage/PaymentList";
import BankAccount from "./page/mypage/BankAccount";
import Settings from "./page/mypage/Settings";
import IdentityVerificationPage from "./page/mypage/IdentityVerification";
import SMSVerification from "./page/mypage/SMSVerification";
import EmailChange from "./page/mypage/EmailChange";
import BlockedList from "./page/mypage/BlockedList";
import SalesHistoryPage from "./page/mypage/SalesHistory";
import SellingListPage from "./page/mypage/SellingList";
import PointHistoryPage from "./page/mypage/PointHistoryPage";
import ActiveTransactionListPage from "./page/mypage/ActiveTransactionListPage";
import RequestListPage from "./page/mypage/RequestListPage";
import LikeListPage from "./page/mypage/LikeListPage";
import HistoryPage from "./page/mypage/HistoryPage";

import List from "./page/ec/List";
import Item from "./page/ec/Item";
import Cart from "./page/ec/Cart";
import Checkout from "./page/ec/Checkout";
import SelectAddress from "./page/SelectAddres";
import SelectPayment from "./page/SelectPayment";
import CheckoutComplete from "./page/ec/CheckoutComplete";

import FleaMarketList from "./page/flea_market/FleaMarketList";
import FleaMarketItem from "./page/flea_market/FleaMarketItem";
import FleaItemCreatePage from "./page/flea_market/FleaItemCreatePage";
import FleaItemEdit from "./page/flea_market/FleaItemEdit";
import FleaMarketTransactions from "./page/flea_market/FleaMarketTransactions";

import DraftListPage from "./page/DraftList";
import UserProfile from "./page/UserProfile";

// ── App ───────────────────────────────────────────────────
// ✅ initAuthOnce の呼び出しは AuthContext 側に移動（二重呼び出し解消）
// ✅ ToastProvider を全体に1箇所だけ適用（個別 Route の <ToastProvider> ラップを撤廃）

const App: React.FC = () => (
  <AuthProvider>
    <ToastProvider>
      <Routes>
        {/* ── public ── */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signup/complete" element={<SignUpComplete />} />
        <Route path="/register/confirm" element={<RegisterConfirm />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/contact/form" element={<ContactForm />} />
        <Route path="/contact/complete" element={<ContactComplete />} />
        <Route path="/tos" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/tokutei" element={<SpecifiedCommercialTransaction />} />
        <Route path="/guid" element={<UserGuide />} />
        <Route path="/guide" element={<Navigate to="/guide/beginner" replace />} />
        <Route path="/guide/:guideId" element={<UserGuide />} />
        <Route path="/password-reset" element={<PasswordResetRequest />} />
        <Route path="/reset-password" element={<PasswordResetExecute />} />
        <Route path="/list" element={<List />} />
        <Route path="/item/:id" element={<Item />} />
        <Route path="/flea-market/list" element={<FleaMarketList />} />
        <Route path="/flea-market/category/*" element={<FleaMarketList />} />
        <Route path="/flea-market/item/:id" element={<FleaMarketItem />} />
        <Route path="*" element={<NotFound />} />

        {/* ── protected ── */}
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
        <Route path="/checkout/address" element={<RequireAuth><SelectAddress /></RequireAuth>} />
        <Route path="/checkout/payment" element={<RequireAuth><SelectPayment /></RequireAuth>} />
        <Route path="/checkout/complete" element={<RequireAuth><CheckoutComplete /></RequireAuth>} />

        <Route path="/flea-market/item/edit/:id" element={<RequireAuth><FleaItemEdit /></RequireAuth>} />
        <Route path="/flea-market/sell/create" element={<RequireAuth><FleaItemCreatePage /></RequireAuth>} />
        <Route path="/flea-market/sell/create/:id" element={<RequireAuth><FleaItemCreatePage /></RequireAuth>} />
        <Route path="/flea-market/transactions/:id" element={<RequireAuth><FleaMarketTransactions /></RequireAuth>} />

        <Route path="/mypage" element={<RequireAuth><MyPage /></RequireAuth>} />
        <Route path="/mypage/address" element={<RequireAuth><AddressList /></RequireAuth>} />
        <Route path="/mypage/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/mypage/profile/edit" element={<RequireAuth><EditProfile /></RequireAuth>} />
        <Route path="/mypage/sales" element={<RequireAuth><SalesHistoryPage /></RequireAuth>} />
        <Route path="/mypage/points" element={<RequireAuth><PointHistoryPage /></RequireAuth>} />
        <Route path="/mypage/payment" element={<RequireAuth><PaymentList /></RequireAuth>} />
        <Route path="/mypage/selling/list" element={<RequireAuth><SellingListPage /></RequireAuth>} />
        <Route path="/mypage/drafts/list" element={<RequireAuth><DraftListPage /></RequireAuth>} />
        <Route path="/mypage/requests" element={<RequireAuth><RequestListPage /></RequireAuth>} />
        <Route path="/mypage/transactions/active" element={<RequireAuth><ActiveTransactionListPage /></RequireAuth>} />
        <Route path="/mypage/likes" element={<RequireAuth><LikeListPage /></RequireAuth>} />
        <Route path="/mypage/transactions/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="/mypage/bank-account" element={<RequireAuth><BankAccount /></RequireAuth>} />
        <Route path="/mypage/password" element={<RequireAuth><PasswordReset /></RequireAuth>} />
        <Route path="/mypage/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="/mypage/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/mypage/settings/identity" element={<RequireAuth><IdentityVerificationPage /></RequireAuth>} />
        <Route path="/mypage/settings/phone" element={<RequireAuth><SMSVerification /></RequireAuth>} />
        <Route path="/mypage/settings/email" element={<RequireAuth><EmailChange /></RequireAuth>} />
        <Route path="/mypage/settings/blocked" element={<RequireAuth><BlockedList /></RequireAuth>} />

        <Route path="/user/profile/:id" element={<RequireAuth><UserProfile /></RequireAuth>} />
        <Route path="/user/:username" element={<RequireAuth><UserProfile /></RequireAuth>} />
      </Routes>
    </ToastProvider>
  </AuthProvider>
);

export default App;