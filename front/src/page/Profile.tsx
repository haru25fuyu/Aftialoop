import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from 'react-hook-form';
import axios from "axios";

import Header from "../component/Header";
import Footer from "../component/Footer";

import { NODE_API } from "../conf/config";

type Inputs = {
    name: string,
    email: string,
    password: string
}

const Profile: React.FC = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();
    const navigate = useNavigate();
    const [user, setuser] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState({
        email: "user@example.com",
        password: "",
        bio: "自己紹介文です。",
        avatar: "https://www.example.com/avatar.png", // デフォルトのアイコン画像
    });

    useEffect(() => {
        //ユーザーチェック
        const token = localStorage.getItem("token");
        if (!token || token === "undefined") {
            navigate("/login");
        }

        //APIdで顧客IDを取得
        axios.post(NODE_API.URL + "/get-customer/data", {},
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...NODE_API.HEADERS,
                },
            }
        )
            .then((res) => {
                console.log(res.data);
                setuser(res.data.user);
            })
            .catch((err) => {
                console.error(err);
                navigate("/login");
            });
    }, []);

    const handleChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const onSubmit = async (data: Inputs) => {
        axios.post(NODE_API.URL + '/signup', data, { headers: NODE_API.HEADERS })
            .then((res) => {
                //仮登録完了ページに遷移
                navigate('/signup/complete');
            })
            .catch((err) => {
                console.error(err);
            });
    };

    //名前、メールアドレス、自己紹介文、アイコン画像の登録住所登録のリンクを設置
    return (
        <>
            <header>
                <Header />
            </header>
            <main>
                <div className="flex justify-center items-center mt-10 max-md:mt-0">
                    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
                        <h2 className="text-2xl font-bold text-center text-gray-900">プロフィール</h2>
                        {isEditing ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* アイコン画像 */}
                                <div className="flex justify-center mb-4">
                                    <img
                                        src={profile.avatar}
                                        alt="プロフィール画像"
                                        className="w-20 h-20 rounded-full border-2 border-gray-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">ユーザーネーム</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profile.email}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">パスワード</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={profile.password}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">自己紹介</label>
                                    <textarea
                                        name="bio"
                                        value={profile.bio}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <button
                                        type="submit"
                                        className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        保存
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div>
                                {/* アイコン画像 */}
                                <div className="flex justify-center mb-4">
                                    <img
                                        src={profile.avatar}
                                        alt="プロフィール画像"
                                        className="w-20 h-20 rounded-full border-2 border-gray-300"
                                    />
                                </div>
                                {/* 表示モード */}
                                <h3 className="text-lg font-medium text-gray-700">{profile.email}</h3>
                                <p className="text-sm text-gray-500">{profile.bio}</p>
                                <div className="mt-4 text-center">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        編集
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <footer>
                <Footer />
            </footer>
        </>
    );
};

export default Profile;
