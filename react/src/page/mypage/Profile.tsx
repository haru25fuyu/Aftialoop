import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Header } from '../../component/Header'; // パス調整
import LoginModal from '../../modal/Login';      // パス調整
import { Avatar } from '../../component/Avatar'; // ★Avatarを使う

import api, { getAccessToken } from '../../conf/api';

// 型定義
type UserData = {
    id: string;
    name: string;
    email: string;
    icon_url: string; // image -> iconUrl に統一
    phone: string;
    bio: string;
    birth: string;
    gender: string;
};

const MyProfilePage: React.FC = () => {
    const location = useLocation();
    // 編集画面から戻ってきた時に "changed" フラグがあればメッセージを出す
    const isChanged = location.state?.changed;

    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const [user, setUser] = useState<UserData | null>(null);

    const handleLoginSuccess = () => {
        setReloadTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const token = getAccessToken();
        if (!token || token === 'undefined') {
            setLoginModalOpen(true);
            return;
        }

        // 自分の詳細情報を取得 (APIエンドポイントは適宜修正)
        api.post('/profile/get', {})
            .then((res) => {
                const u = res.data;
                console.log('Fetched user data:', u);
                setUser({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    icon_url: u.icon_url,
                    phone: u.phone || "未設定",
                    bio: u.bio || "未設定", // バックエンドからbioが返ってくるようにする
                    birth: u.birth || "未設定",
                    gender: u.gender === "1" ? "男性" : (u.gender === "2" ? "女性" : "未回答")
                });
            })
            .catch((err) => {
                console.error(err);
                setLoginModalOpen(true);
            });
    }, [reloadTrigger]);

    if (!user) return <div className="p-20 text-center">読み込み中...</div>;

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setLoginModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
            />

            <main className="max-w-2xl mx-auto pt-6 px-4">
                {/* 完了メッセージ */}
                {isChanged && (
                    <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in-down">
                        <span className="text-xl">✅</span>
                        プロフィールを更新しました
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex flex-col items-center">
                        <div className="mb-4">
                            {/* ★Avatarコンポーネントを使用 */}
                            <Avatar
                                src={user.icon_url}
                                name={user.name}
                                className="w-28 h-28 text-4xl border-4 border-white shadow-lg"
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                        <p className="text-gray-500 text-sm mt-1">{user.email}</p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* 項目リスト */}
                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center border-b border-gray-50 pb-4 last:border-0">
                            <label className="text-sm font-bold text-gray-500">自己紹介</label>
                            <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                {user.bio}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center border-b border-gray-50 pb-4 last:border-0">
                            <label className="text-sm font-bold text-gray-500">電話番号</label>
                            <div className="text-gray-800 font-mono">{user.phone}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center border-b border-gray-50 pb-4 last:border-0">
                            <label className="text-sm font-bold text-gray-500">性別</label>
                            <div className="text-gray-800">{user.gender}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center border-b border-gray-50 pb-4 last:border-0">
                            <label className="text-sm font-bold text-gray-500">誕生日</label>
                            <div className="text-gray-800">{user.birth}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center border-b border-gray-50 pb-4 last:border-0">
                            <label className="text-sm font-bold text-gray-500">パスワード</label>
                            <div>
                                <Link to="/reset-password" className="text-sm text-emerald-600 font-bold hover:underline">
                                    パスワードを変更する
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50">
                        {/* ★編集ページへのリンク (先ほど作ったページへ) */}
                        <Link
                            to="/mypage/profile/edit"
                            className="block w-full py-3 bg-emerald-600 text-white text-center font-bold rounded-xl shadow-md hover:bg-emerald-700 transition-all hover:-translate-y-0.5"
                        >
                            プロフィールを編集する
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MyProfilePage;