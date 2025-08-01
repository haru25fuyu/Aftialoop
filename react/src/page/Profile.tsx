import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { UserRound } from "lucide-react";

import { Header } from '../component/Header';
import LoginModal from '../modal/Login';

import api from '../conf/api';
import { CONFIG } from '../conf/config';

type Inputs = {
    id: string,
    name: string,
    email: string,
    image: string,
    password: string
    phone: string,
    bio: string,
    birth: string,
    gender: string
}

const Profile: React.FC = () => {
    const location = useLocation();
    const chenge = location.state?.chenge;
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const [user, setUser] = useState<Inputs>({
        id: '',
        name: '',
        email: '',
        image: '',
        password: '',
        phone: '',
        bio: '',
        birth: '',
        gender: ''
    });

    const handleLoginSuccess = () => {
        setReloadTrigger(prev => prev + 1); // トリガーを変えることでuseEffect再発火
    };

    useEffect(() => {
        // ユーザー情報を取得
        const token = localStorage.getItem('token');
        if (!token || token === 'undefined') {
            setLoginModalOpen(true);
        }
        api.post('/profile/get', {})
            .then((res) => {
                if (res.data.IconURL != null && res.data.IconURL !== "") {
                    // 画像URLがある場合はBASE_URLを付加
                    res.data.IconURL = CONFIG.BASE_URL + res.data.IconURL;
                }

                setUser({
                    id: res.data.ID || "",
                    name: res.data.Name || "",
                    email: res.data.Email || "",
                    image: res.data.IconURL || "",
                    password: "",
                    phone: res.data.PhoneNumber || "",
                    bio: res.data.Bio || "",
                    birth: res.data.DateOfBirth || "",
                    gender: res.data.Gender || ""
                });
                console.log(res.data);
            })
            .catch((err) => {
                console.error(err);
                localStorage.removeItem('token');
                localStorage.removeItem('expirationTime');
                setLoginModalOpen(true);
            });
    }, [reloadTrigger]);

    return (
        <div>
            <Header />
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => { setLoginModalOpen(false); }} 
                onLoginSuccess={handleLoginSuccess}
            />
            <div className="flex justify-center items-center mt-8 max-md:mt-0">
                <div className="w-full max-w-md p-5 space-y-6 bg-white rounded shadow-md">
                    <h2 className="text-2xl font-bold text-center text-gray-900">ユーザー情報</h2>
                    {chenge && <p className="text-red-500">ユーザー情報が変更されました</p>}
                    <div className="relative w-32 h-32 mx-auto">
                        <label className="w-full h-full block rounded-full overflow-hidden cursor-pointer group">
                            {/* 画像プレビューがある場合はプレビュー画像、ない場合はアイコンを表示 */}
                            {user.image ? (
                                <img
                                    src={user.image + "?t=" + new Date().getTime()}
                                    alt="プレビュー"
                                    className="w-full h-full object-cover transition-opacity group-hover:opacity-70"
                                />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full bg-gray-200">
                                    <UserRound className="text-gray-500 w-12 h-12 rounded-full object-cover" />
                                </div>
                            )}
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ユーザーネーム</label>
                        <p>{user.name}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                        <p>{user.email}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">電話番号</label>
                        <p>{user.phone}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">パスワード</label>
                        <Link to="/ResetPassword" className="text-indigo-600 hover:underline">パスワードの変更はこちら</Link>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">自己紹介(オークション用)</label>
                        <p>{user.bio}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">性別</label>
                        <div className="flex gap-4 mt-1">
                            <label className="flex items-center space-x-1">
                                <p>{user.gender == "1" ? "男性" : (user.gender == "2" ? "女性" : "未回答")}</p>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">誕生日</label>
                        <p>{user.birth}</p>
                    </div>
                    <div>
                        <Link to="/Profile/Edit"
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            編集
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;