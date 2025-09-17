import { Routes, Route } from 'react-router-dom';

import './css/App.css'

import Home from './page/Home'
import SignUp from './page/SignUp';
import SignUpComplete from './page/SignUpComplete';
import RegisterConfirm from './page/RegisterConfirm';
import Login from './page/Login';
//import PaymentForm from './page/PaymentForm';
//import PaymentComplete from './page/PaymentComplete';
import MyPage from './page/MyPage';
import PaymentList from './page/PaymentList';
import List from './page/List';
import EditProfile from './page/EditProfile';
import Profile from './page/Profile';
import AddressList from './page/AddressList';
import Item from './page/Item';
import Cart from './page/Cart';
import NotFound from './page/NotFound';
import Contact from './page/Contact';
import FileTree from './page/SetFile';
import Checkout from './page/Checkout';
import SelectAddress from "./page/SelectAddres";
import SelectPayment from "./page/SelectPayment";
import CheckoutComplete from "./page/CheckoutComplete";

const App: React.FC = () => {
  return (
    <>
      <Routes>
        <Route path={`/`} element={<Home />} />
        <Route path={`/paymentForm`} element={<Home />} />
        <Route path={`/signup`} element={<SignUp />} />
        <Route path={`/signup/complete`} element={<SignUpComplete />} />
        <Route path={`/register/confirm`} element={<RegisterConfirm />} />
        <Route path={`/login`} element={<Login />} />
        <Route path={`/mypage`} element={<MyPage />} />
        <Route path={`/payment/List`} element={< PaymentList />} />
        <Route path={`/list/search/:query`} element={<List />} />
        <Route path={`/list/:category/:subCategory`} element={<List />} />
        <Route path={`/list/:category/search/:query`} element={<List />} />
        <Route path={`/list/:category/:subCategory/search/:query`} element={<List />} />
        <Route path={`/list/:category`} element={<List />} />
        <Route path={`/list/search/:query`} element={<List />} />
        <Route path={`/list`} element={<List />} />
        <Route path={`/address/list`} element={<AddressList />} />
        <Route path={`/profile/edit`} element={<EditProfile />} />
        <Route path={`/profile`} element={<Profile />} />
        <Route path={`/item/:id`} element={<Item />} />
        <Route path={`/cart`} element={<Cart />} />
        <Route path={`*`} element={<NotFound />} />
        <Route path={`/contact`} element={<Contact />} />
        <Route path={`/filetree`} element={<FileTree />} />
        <Route path={`/checkout`} element={<Checkout />} />
        {/* <Route path={`/payment/complete`} element={<PaymentComplete />} /> */}
        <Route path={`/checkout/address`} element={<SelectAddress />} />
        <Route path={`/checkout/payment`} element={<SelectPayment />} />
        <Route path={`/checkout/complete`} element={<CheckoutComplete />} />
        {/* <Route path={`/payment/form`} element={<PaymentForm />} /> */}

      </Routes>
    </>
  )
}

export default App
