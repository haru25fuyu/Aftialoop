import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    User, Settings, ChevronRight, Wallet, Coins,
    ShoppingBag, Package, List, Heart, LogOut, MapPin, CreditCard
} from "lucide-react";
import { Header } from "../component/Header";
import api from "../conf/api";
import { CONFIG } from "../conf/config";

// ユーザー情報の型定義
interface UserProfile {
    id: string;
    name: string;
    icon_url: string;
    point: number;
    sales_balance: number;
    listings_count: number; // 出品数
    followers_count: number;
    following_count: number;
}

export default function MyPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        // ユーザー情報取得 (API実装済み想定)
        api.post("/mypage").then((res) => {
            if (!res.data.user) {
                navigate("/login"); // 未ログインなら飛ばす
            } else {
                setUser(res.data.user);
                console.log("ユーザー情報:", res.data.user);
            }
        });
    }, []);

    if (!user) return <div className="p-10 text-center">Loading...</div>;

    return (
        <>
            <Header />
            <div className="max-w-md mx-auto pb-20 bg-gray-50 min-h-screen">

                {/* --- 1. プロフィールエリア (一番上) --- */}
                <div className="bg-white p-6 pb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                            {/* アバター画像がなければデフォルトアイコン */}
                            {user.icon_url ? (
                                <img src={ CONFIG.BASE_URL + user.icon_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                    <User size={32} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-gray-800">{user.name}</h1>
                            <Link to="/mypage/profile/edit" className="text-xs text-gray-400 hover:text-blue-500">
                                プロフィールを編集 &gt;
                            </Link>
                        </div>
                    </div>

                    {/* フォロワー・出品数などのステータス */}
                    <div className="flex justify-between mt-6 text-center border-t border-gray-100 pt-4">
                        <div className="flex-1 border-r border-gray-100">
                            <div className="text-lg font-bold text-gray-800">{user.listings_count}</div>
                            <div className="text-xs text-gray-400">出品数</div>
                        </div>
                        <div className="flex-1 border-r border-gray-100">
                            <div className="text-lg font-bold text-gray-800">{user.following_count}</div>
                            <div className="text-xs text-gray-400">フォロー</div>
                        </div>
                        <div className="flex-1">
                            <div className="text-lg font-bold text-gray-800">{user.followers_count}</div>
                            <div className="text-xs text-gray-400">フォロワー</div>
                        </div>
                    </div>
                </div>

                {/* --- 2. お金とポイント (Wallet) --- */}
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                        {/* 売上金 (さっき作ったページへ遷移) */}
                        <Link to="/mypage/sales" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-24 hover:shadow-md transition relative overflow-hidden group">
                            <div className="absolute right-[-10px] top-[-10px] bg-blue-50 w-20 h-20 rounded-full opacity-50 group-hover:scale-110 transition"></div>
                            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm relative z-10">
                                <Wallet size={18} /> 売上金残高
                            </div>
                            <div className="text-xl font-bold text-gray-800 relative z-10">
                                ¥{(user.sales_balance ?? 0).toLocaleString()}
                            </div>
                        </Link>

                        {/* ポイント */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-24 relative overflow-hidden">
                            <div className="absolute right-[-10px] top-[-10px] bg-yellow-50 w-20 h-20 rounded-full opacity-50"></div>
                            <div className="flex items-center gap-2 text-yellow-600 font-bold text-sm relative z-10">
                                <Coins size={18} /> 保有ポイント
                            </div>
                            <div className="text-xl font-bold text-gray-800 relative z-10">
                                {(user.point ?? 0).toLocaleString()} P
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- 3. やることリスト (ToDo) --- */}
                {/* フリマアプリなら「発送してください」「評価してください」が出る場所 */}
                <div className="bg-orange-50 border border-orange-100 mx-4 p-3 rounded-lg flex items-center justify-between mb-4 cursor-pointer hover:bg-orange-100">
                    <div className="flex items-center gap-3 text-sm font-bold text-orange-800">
                        <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">New</span>
                        <span>発送待ちの商品があります</span>
                    </div>
                    <ChevronRight size={16} className="text-orange-400" />
                </div>

                {/* --- 4. メニューリスト --- */}
                <div className="space-y-6 px-4">

                    {/* ▼ 買い物・取引関係 */}
                    <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                        <h2 className="text-xs font-bold text-gray-400 mb-2 ml-1">お買い物・取引</h2>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">

                            <MenuItem
                                icon={<ShoppingBag size={20} className="text-gray-400" />}
                                label="購入した商品・取引履歴"
                                to="/mypage/transactions" // ← さっき作った履歴ページへ
                                sub="公式・フリマ"
                            />

                            <MenuItem
                                icon={<Heart size={20} className="text-gray-400" />}
                                label="いいね！した商品"
                                to="/mypage/likes"
                            />
                        </div>
                    </section>

                    {/* ▼ 出品関係 */}
                    <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                        <h2 className="text-xs font-bold text-gray-400 mb-2 ml-1">出品・販売</h2>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">
                            <MenuItem
                                icon={<List size={20} className="text-gray-400" />}
                                label="出品した商品"
                                to="/mypage/selling/list"
                                sub="出品中・取引中・売却済み"
                            />
                            <MenuItem
                                icon={<Package size={20} className="text-gray-400" />}
                                label="下書き一覧"
                                to="/mypage/drafts/list"
                            />
                        </div>
                    </section>

                    {/* ▼ 設定・その他 */}
                    <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                        <h2 className="text-xs font-bold text-gray-400 mb-2 ml-1">設定・アカウント</h2>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">
                            <MenuItem
                                icon={<MapPin size={20} className="text-gray-400" />}
                                label="お届け先住所の管理"
                                to="/mypage/address"
                            />
                            <MenuItem
                                icon={<CreditCard size={20} className="text-gray-400" />}
                                label="支払い方法（カード）"
                                to="/mypage/payment"
                            />
                            <MenuItem
                                icon={<Settings size={20} className="text-gray-400" />}
                                label="アカウント設定"
                                to="/mypage/settings"
                            />
                            <button
                                onClick={() => {
                                    api.post("/logout").then(() => window.location.href = "/");
                                }}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-red-500"
                            >
                                <div className="flex items-center gap-3">
                                    <LogOut size={20} />
                                    <span className="text-sm font-medium">ログアウト</span>
                                </div>
                            </button>
                        </div>
                    </section>
                </div>

            </div>
        </>
    );
}

// メニュー項目のコンポーネント
const MenuItem = ({ icon, label, to, sub }: { icon: React.ReactNode, label: string, to: string, sub?: string }) => (
    <Link to={to} className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
        <div className="flex items-center gap-3">
            {icon}
            <div>
                <div className="text-sm font-medium text-gray-800">{label}</div>
                {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
            </div>
        </div>
        <ChevronRight size={16} className="text-gray-300" />
    </Link>
);