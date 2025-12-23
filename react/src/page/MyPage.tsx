// PaymentForm.tsx
import React, { useState } from 'react';
import { useEffect } from 'react';

import Header from '../component/Header';
import Footer from '../component/Footer';
import LoginModal from '../modal/Login';
import ContentsList from '../component/ContentsList';
import { Content } from '../types/Content';
import BasicContent, { LinkContent } from '../component/Content';

import api, { getAccessToken } from '../conf/api';
import { LogOut } from 'lucide-react';

const MyPage: React.FC = () => {
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    const [reloadTrigger, setReloadTrigger] = useState(0);
    useEffect(() => {
        const token = getAccessToken();
        console.log("MyPage トークン確認:", token);
        if (!token || token === 'undefined') {
            setLoginModalOpen(true); // ← ここだけにする
            return;
        }

        api.post('/mypage')
            .then((res) => {
                console.log("マイページ情報:", res.data);
            })
            .catch((err) => {
                console.error(err);
                setLoginModalOpen(true); // ← navigate せずモーダル表示
            });
    }, [reloadTrigger]);

    const handleLoginSuccess = () => {
        console.log("ログイン成功 - MyPage");
        setReloadTrigger(prev => prev + 1); // トリガーを変えることでuseEffect再発火
    };

    const Logout = (isLogout: boolean) => {
        if (isLogout) {
            setReloadTrigger(prev => prev + 1); // トリガーを変えることでuseEffect再発火
        }
    };

    const logContent: Content[] = [
        { id: '1', name: '商品1', discription: "商品1の説明", price: 1000, point: 1000, image_url: '/data/Logo.JPG' },
        { id: '2', name: '商品2', discription: "商品1の説明", price: 2000, point: 2000, image_url: '/data/Logo.JPG' },
        { id: '3', name: '商品3', discription: "商品1の説明", price: 3000, point: 3000, image_url: '/data/Logo.JPG' },
        { id: '4', name: '商品4', discription: "商品1の説明", price: 4000, point: 4000, image_url: '/data/Logo.JPG' },
        { id: '5', name: '商品5', discription: "商品1の説明", price: 5000, point: 5000, image_url: '/data/Logo.JPG' },
        { id: '6', name: '商品6', discription: "商品1の説明", price: 6000, point: 6000, image_url: '/data/Logo.JPG' },
        { id: '7', name: '商品7', discription: "商品1の説明", price: 7000, point: 7000, image_url: '/data/Logo.JPG' },
        { id: '8', name: '商品8', discription: "商品1の説明", price: 8000, point: 8000, image_url: '/data/Logo.JPG' },
        { id: '9', name: '商品9', discription: "商品1の説明", price: 9000, point: 9000, image_url: '/data/Logo.JPG' },
        { id: '10', name: '商品10', discription: "商品1の説明", price: 10000, point: 10000, image_url: '/data/Logo.JPG' },
    ];
    const linkContent: Content[] = [
        { id: '1', name: '支払い方法', discription: "商品1の説明", price: 0, point: 0, image_url: '/payment/list' },
        { id: '2', name: 'アカウント設定', discription: "商品1の説明", price: 0, point: 0, image_url: '/profile' },
        { id: '3', name: 'アドレス帳', discription: "商品1の説明", price: 0, point: 0, image_url: '/address/list' },
        { id: '4', name: 'サブスクリプション管理', discription: "商品1の説明", price: 0, point: 0, image_url: '/150x150.png' },
    ];

    return (
        <div className="flex flex-col min-h-screen">
            <header>
                <Header />
            </header>
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => { setLoginModalOpen(false); }} // 閉じられないので空関数 or 固定表示
                onLoginSuccess={handleLoginSuccess}
            />
            <main className="flex-grow">
                <div className="flex-grow flex justify-center items-center mt-10 max-md:mt-0">
                    <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded shadow-md">
                        <h2 className="text-2xl font-bold text-center text-gray-900">マイページ</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold">注文履歴</h3>
                                <div className="flex overflow-x-auto space-x-4">
                                    <ContentsList contents={logContent} Component={BasicContent} slider={true} show_num={3} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold">お気に入りリスト</h3>
                                <div className="flex overflow-x-auto space-x-4">
                                    <ContentsList contents={logContent} Component={BasicContent} slider={true} show_num={3} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold">アカウントサービス</h3>
                                <div className="flex overflow-x-auto space-x-4">
                                    <ContentsList contents={linkContent} Component={LinkContent} slider={true} show_num={3} />
                                </div>
                                <button
                                    className="w-full px-4 py-2 mt-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
                                    onClick={() => Logout(true)}
                                >
                                    ログアウト
                                </button>   
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default MyPage;

