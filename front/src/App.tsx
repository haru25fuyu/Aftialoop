import { useState } from 'react'
import axios from 'axios'
import { BrowserRouter, Link, Routes, Route } from "react-router-dom";

import './css/App.css'
import ContentsList from './component/ContentsList'
import InputList from './component/InputList'
import BasicContent from './component/BasicContent'
import GoogleOAuth from './component/GoogleOAuth'
import Home from './page/Home'
import SignUp from './page/SignUp';

import { Content } from './types/Content';
import { InputFieldProps } from './types/input';

import { NODE_API } from './conf/config';

const handleError = (error) => {
  if (error.response) {
    // サーバーがステータスコードを返した場合
    console.error('Response data:', error.response.data);
    console.error('Response status:', error.response.status);
    console.error('Response headers:', error.response.headers);
  } else if (error.request) {
    // リクエストは送信されたが、応答がなかった場合
    console.error('Request data:', error.request);
  } else {
    // リクエストの設定中にエラーが発生した場合
    console.error('Error message:', error.message);
  }
  console.error('Error config:', error.config);
};
function App() {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("送信データ:", formData);
    try {
      const res = await axios.post(NODE_API.URL + "/signup", JSON.stringify(formData), { headers: NODE_API.HEADERS });
      console.log("受信データ：", res.data); // レスポンスを保存
    } catch (err) {
      handleError(err);
    }
  };
  const test_data: Content[] = [
    {
      id: 1,
      name: "test",
      price: 100,
      url: "http://localhost:3000/"
    },
    {
      id: 2,
      name: "test2",
      price: 200,
      url: "http://localhost:3000/"
    },
    {
      id: 3,
      name: "test3",
      price: 300,
      url: "http://localhost:3000/"
    }
  ]
  const test_input: InputFieldProps[] = [
    {
      label: "名前",
      name: "name",
      type: "text",
      placeholder: "名前を入力してください",
      onChange: handleFieldChange,
      helperText: "",
    },
    {
      label: "パスワード",
      name: "password",
      type: "password",
      placeholder: "パスワードを入力してください",
      onChange: handleFieldChange,
      helperText: "",
    },
    {
      label: "test3",
      name: "",
      type: "submit",
      placeholder: "",
      onChange: () => { },
      helperText: "",
    }
  ]


  return (
    <>
      <Routes>
        <Route path={`/`} element={<Home />} />
        <Route path={`/paymentForm`} element={<Home />} />    
        <Route path={`/signup`} element={<SignUp />} />    
      </Routes>
    </>
  )
}

export default App
