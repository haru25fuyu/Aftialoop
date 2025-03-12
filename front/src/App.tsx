import React from 'react'
import { Routes, Route } from "react-router-dom";

import './css/App.css'

import Home from './page/Home'
import SignUp from './page/SignUp';
import SignUpComplete from './page/SignUpComplete';
import RegisterConfirm from './page/RegisterConfirm';
import Login from './page/Login';
//import PaymentForm from './page/PaymentForm';
//import PaymentComplete from './page/PaymentComplete';
import MyPage from './page/MyPage';
import PaymentRegistration from './page/PaymentRegistration';
import List from './page/List';
import EditAddress from './page/EditAddress';
import EditProfile from './page/EditProfile';


function App() {

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
        <Route path={`/payment/registration`} element={<PaymentRegistration />} />
        <Route path={`/list`} element={<List />} />
        <Route path={`/address/edit`} element={<EditAddress />} />
        <Route path={`/profile/edit`} element={<EditProfile />} />
      </Routes>
    </>
  )
}

export default App
