import React from 'react';
import { useEffect } from 'react';
import axios from 'axios';

import { Header } from '../component/Header.tsx';
import { Footer } from '../component/Footer.tsx';

import { NODE_API } from '../conf/config';

const RegisterConfirm: React.FC = () => {
    useEffect(() => {
        //GETトークンパラメーターの取得
        const url = new URL(window.location.href);
        const token = url.searchParams.get('token');
        
        //本登録APIの呼び出し
        axios.get(NODE_API.URL + '/register/confirm?token=' + token, { headers: NODE_API.HEADERS })            .then((res) => {
                console.log(res.data);
            })
            .catch((err) => {
                console.error(err);
            });
    }, []);
    return (
        <div className="flex flex-col min-h-screen">
            <header>
                <Header />
            </header>
            <main className="flex-grow">
                <div className="flex-grow flex justify-center items-center mt-10 max-md:mt-0">
                    <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded shadow-md">
                        <h2 className="text-2xl font-bold text-center text-gray-900">本登録完了</h2>
                        <p className="mb-4">ご登録ありがとうございます！アカウントが正常に作成されました。</p>
                        {localStorage.getItem('cart') ? (
                            <a href="/purchase" className="text-blue-500 underline">購入ページへ</a>
                        ) : (
                            <a href="/" className="text-blue-500 underline">トップページへ</a>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default RegisterConfirm;