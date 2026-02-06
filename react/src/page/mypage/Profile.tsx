import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Header } from '../../component/Header';
import LoginModal from '../../modal/Login';
import { Avatar } from '../../component/Avatar';
// キーやスマホ、リンクのアイコンを追加
import { Mail, Phone, Calendar, User, ShieldCheck, ChevronRight, KeyRound, Globe } from 'lucide-react';

import api, { getAccessToken } from '../../conf/api';

type UserData = {
    id: string;
    name: string;
    email: string;
    icon_url: string;
    phone: string;
    bio: string;
    birth: string;
    gender: string;
    // ★追加: 連携状況フラグ (バックエンドから受け取る想定)
    is_google_connected?: boolean;
    is_line_connected?: boolean;
    is_apple_connected?: boolean;
};

const MyProfilePage: React.FC = () => {
    const location = useLocation();
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

        api.post('/profile/get', {})
            .then((res) => {
                const u = res.data;
                setUser({
                    ...u, // 既存データ展開
                    phone: u.phone || "未設定",
                    bio: u.bio || "自己紹介が設定されていません",
                    birth: u.date_of_birth || "未設定",
                    gender: u.gender === "1" ? "男性" : (u.gender === "2" ? "女性" : "未回答"),
                    is_google_connected: u.is_google_connected,
                    is_line_connected: false,
                    is_apple_connected: u.is_apple_connected,
                });
                console.log('User data loaded:', u);
            })
            .catch((err) => {
                console.error(err);
                setLoginModalOpen(true);
            });
    }, [reloadTrigger]);

    // SNS連携ボタンのハンドラ（仮）
    const handleSocialLink = (provider: string) => {
        alert(`${provider}連携の処理をここに書きます (OAuthリダイレクトなど)`);
    };

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
                {isChanged && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-bounce-short">
                        <span>✅</span>
                        <span className="font-bold text-sm">プロフィールを更新しました</span>
                    </div>
                )}

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* --- 上部プロフィール (変更なし) --- */}
                    <div className="p-8 border-b border-gray-50 flex flex-col items-center bg-gradient-to-b from-white to-gray-50/50">
                        <div className="mb-4">
                            <Avatar src={user.icon_url} name={user.name} className="w-32 h-32 text-4xl border-4 border-white shadow-xl" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900">{user.name}</h1>
                        <Link to="/mypage/profile/edit" className="mt-6 px-8 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-full shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2">
                            プロフィールを編集
                        </Link>
                    </div>

                    <div className="p-6 space-y-10">
                        {/* --- 公開情報 (変更なし) --- */}
                        <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                            <h3 className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest px-1">
                                <User size={14} /> 公開情報
                            </h3>
                            <div className="bg-gray-50/50 rounded-2xl p-5 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">自己紹介</label>
                                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{user.bio}</p>
                                </div>
                                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-gray-400" />
                                        <span className="text-xs font-bold text-gray-500">性別・誕生日</span>
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">{user.gender} / {user.birth}</span>
                                </div>
                            </div>
                        </section>

                        {/* --- 連絡先情報 --- */}
                        <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                            <h3 className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest px-1">
                                <ShieldCheck size={14} /> 連絡先・本人確認
                            </h3>
                            <div className="space-y-3">
                                <Link to="/mypage/settings/email" className="group flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                            <Mail size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase">メールアドレス</p>
                                            <p className="text-sm font-bold text-gray-700">{user.email}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300 group-hover:text-emerald-500" />
                                </Link>

                                <Link to="/mypage/settings/phone" className="group flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                            <Phone size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase">電話番号</p>
                                            <p className="text-sm font-bold text-gray-700">{user.phone}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300 group-hover:text-emerald-500" />
                                </Link>
                            </div>
                        </section>

                        {/* --- セキュリティ・ログイン管理 --- */}
                        <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                            <h3 className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest px-1">
                                <KeyRound size={14} /> セキュリティ・ログイン管理
                            </h3>
                            <div className="border border-gray-100 rounded-2xl overflow-hidden">
                                {/* パスワード変更 */}
                                <Link to="/mypage/password" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                                            <KeyRound size={18} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">パスワード変更</span>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300" />
                                </Link>

                                {/* Google連携 */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                            <Globe size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-700">Googleアカウント</p>
                                            <p className="text-xs text-gray-400">ログインに使用できます</p>
                                        </div>
                                    </div>
                                    {user.is_google_connected ? (
                                        <button onClick={() => handleSocialLink('Google')} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                            連携済み
                                        </button>
                                    ) : (
                                        <button onClick={() => handleSocialLink('Google')} className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200">
                                            連携する
                                        </button>
                                    )}
                                </div>
                                {/* Apple連携 
                                <div className="flex items-center justify-between p-4 border-b border-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-black text-white rounded-lg">
                                            <Apple size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-700">Appleアカウント</p>
                                            <p className="text-xs text-gray-400">ログインに使用できます</p>
                                        </div>
                                    </div>
                                    {user.is_apple_connected ? (
                                        <button onClick={() => handleSocialLink('Apple')} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                            連携済み
                                        </button>
                                    ) : (
                                        <button onClick={() => handleSocialLink('Apple')} className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200">
                                            連携する
                                        </button>
                                    )}
                                </div>

                                */}

                                {/* LINE連携 
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                            <Smartphone size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-700">LINEアカウント</p>
                                            <p className="text-xs text-gray-400">ログインに使用できます</p>
                                        </div>
                                    </div>
                                    {user.is_line_connected ? (
                                        <button onClick={() => handleSocialLink('Line')} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                            連携済み
                                        </button>
                                    ) : (
                                        <button onClick={() => handleSocialLink('Line')} className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200">
                                            連携する
                                        </button>
                                    )}
                                </div>
                                */}
                            </div>
                        </section>

                        <div className="pt-4 text-center">
                            <button className="text-xs font-bold text-red-400 hover:text-red-600 hover:underline">
                                ログアウトはこちら
                            </button>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default MyProfilePage;