import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import axios from 'axios'

import './css/App.css'
import ContentsList from './component/ContentsList'
import InputList from './component/InputList'
import BasicContent from './component/BasicContent'
import GoogleOAuth from './component/GoogleOAuth'

import { Content } from './types/Content';
import { InputFieldProps } from './types/input';

const headers ={
  "Content-Type": "application/json"// このヘッダーを追加
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
      const res = await axios.post("http://localhost:3000/signup", JSON.stringify(formData), { headers });
      console.log("受信データ：", res.data); // レスポンスを保存
    } catch (err) {
      console.error("エラーが発生しました:", err);
    }
  };
  const [count, setCount] = useState(0)
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
      <div>

        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          クリック回数 is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <ContentsList contents={test_data} Component={BasicContent} />
      <InputList inputs={test_input} method='post' onSubmit={handleSubmit} />
           <GoogleOAuth/>
    </>
  )
}

export default App
