import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    User, Settings, ChevronRight, Wallet, Coins,
    ShoppingBag, Package, List, Heart, LogOut, MapPin, CreditCard,
    Truck, ClipboardCheck
} from "lucide-react";
import { Header } from "../../component/Header";
import api from "../../conf/api";
import { CONFIG } from "../../conf/config";

// ユーザー情報の型定義
interface UserProfile {
    id: string;
    name: string;
    icon_url: string;
    point: number;
    sales_balance: number;
    listings_count: number;
    followers_count: number;
    following_count: number;

    // ★APIから「件数」だけ返してもらうように変更
    pending_requests_count: number;   // あなたへの購入申請 (承認待ち)
    active_transactions_count: number; // 進行中の取引 (発送待ち・受取待ちなど)
}

export default function MyPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        api.post("/mypage").then((res) => {
            if (!res.data.user) {
                navigate("/login");
            } else {
                // ★ダミーデータ: 実際はGo側で件数を集計して返してください
                const userData = res.data.user;

                // (テスト用に数字を入れておきます)
                if (userData.pending_requests_count === undefined) userData.pending_requests_count = 2;
                if (userData.active_transactions_count === undefined) userData.active_transactions_count = 5;

                setUser(userData);
            }
        });
    }, []);

    if (!user) return <div className="p-10 text-center">Loading...</div>;

    return (
        <>
            <Header />
            <div className="max-w-md mx-auto pb-24 bg-gray-50 min-h-screen">

                {/* --- 1. プロフィールエリア --- */}
                <div className="bg-white p-6 pb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                            {user.icon_url ? (
                                <img src={CONFIG.BASE_URL + user.icon_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                    <User size={32} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-gray-800">{user.name}</h1>
                            <Link to="/mypage/profile" className="text-xs text-gray-400 hover:text-blue-500">
                                プロフィールを編集 &gt;
                            </Link>
                        </div>
                    </div>
                    {/* ステータス */}
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

                {/* --- 2. お金とポイント --- */}
                <div className="p-4 pb-2">
                    <div className="grid grid-cols-2 gap-3">
                        {/* 売上金 */}
                        <Link to="/mypage/sales" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-24 relative overflow-hidden group hover:shadow-md transition">
                            {/* 装飾用の背景丸 */}
                            <div className="absolute -right-3 -top-3 bg-blue-50 w-20 h-20 rounded-full opacity-60 group-hover:scale-110 transition-transform duration-300"></div>

                            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm relative z-10">
                                <div className="p-1.5 bg-blue-100 rounded-lg">
                                    <Wallet size={18} />
                                </div>
                                <span>売上金</span>
                            </div>
                            <div className="text-xl font-bold text-gray-800 relative z-10 tracking-tight">
                                ¥{(user.sales_balance ?? 0).toLocaleString()}
                            </div>
                        </Link>

                        {/* ポイント */}
                        <Link to="/mypage/points" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-24 relative overflow-hidden group hover:shadow-md transition">
                            {/* 装飾用の背景丸 */}
                            <div className="absolute -right-3 -top-3 bg-yellow-50 w-20 h-20 rounded-full opacity-60 group-hover:scale-110 transition-transform duration-300"></div>

                            <div className="flex items-center gap-2 text-yellow-600 font-bold text-sm relative z-10">
                                <div className="p-1.5 bg-yellow-100 rounded-lg">
                                    <Coins size={18} />
                                </div>
                                <span>ポイント</span>
                            </div>
                            <div className="text-xl font-bold text-gray-800 relative z-10 tracking-tight">
                                {(user.point ?? 0).toLocaleString()} P
                            </div>
                        </Link>
                    </div>
                </div>

                {/* --- 3. やること・状況 (デザイン合わせ) --- */}
                <div className="px-4 pb-4">
                    <h2 className="text-xs font-bold text-gray-400 mb-2 ml-1">やること・状況</h2>
                    <div className="grid grid-cols-2 gap-3">

                        {/* 購入申請 */}
                        <Link to="/mypage/requests" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-24 relative overflow-hidden group hover:shadow-md transition">
                            <div className="absolute -right-3 -top-3 bg-orange-50 w-20 h-20 rounded-full opacity-60 group-hover:scale-110 transition-transform duration-300"></div>

                            <div className="flex items-center gap-2 text-orange-600 font-bold text-sm relative z-10">
                                <div className="p-1.5 bg-orange-100 rounded-lg">
                                    <ClipboardCheck size={18} />
                                </div>
                                <span>購入申請</span>
                            </div>

                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-2xl font-bold text-gray-800">{user.pending_requests_count}</span>
                                <span className="text-xs text-gray-400 font-bold">件</span>
                            </div>

                            {/* バッジ */}
                            {user.pending_requests_count > 0 && (
                                <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse ring-2 ring-white"></div>
                            )}
                        </Link>

                        {/* 取引中 */}
                        <Link to="/mypage/transactions/active" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-24 relative overflow-hidden group hover:shadow-md transition">
                            <div className="absolute -right-3 -top-3 bg-indigo-50 w-20 h-20 rounded-full opacity-60 group-hover:scale-110 transition-transform duration-300"></div>

                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm relative z-10">
                                <div className="p-1.5 bg-indigo-100 rounded-lg">
                                    <Truck size={18} />
                                </div>
                                <span>取引中</span>
                            </div>

                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-2xl font-bold text-gray-800">{user.active_transactions_count}</span>
                                <span className="text-xs text-gray-400 font-bold">件</span>
                            </div>

                            {/* バッジ */}
                            {user.active_transactions_count > 0 && (
                                <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse ring-2 ring-white"></div>
                            )}
                        </Link>

                    </div>
                </div>

                {/* --- 4. メニューリスト --- */}
                <div className="space-y-6 px-4 mt-6">
                    {/* ▼ 買い物・取引関係 */}
                    <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                        <h2 className="text-xs font-bold text-gray-400 mb-2 ml-1">お買い物・取引</h2>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">
                            <MenuItem
                                icon={<ShoppingBag size={20} className="text-gray-400" />}
                                label="購入した商品・取引履歴"
                                to="/mypage/transactions/history" // 過去の履歴一覧
                                sub="完了した取引はこちら"
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

const MenuItem = ({ icon, label, to, sub }: { icon: React.ReactNode, label: string, to: string, sub?: string }) => (
    <Link to={to} className="flex items-center justify-between p-4 hover:bg-gray-50 transition group">
        <div className="flex items-center gap-3">
            <div className="group-hover:text-blue-500 transition-colors">{icon}</div>
            <div>
                <div className="text-sm font-medium text-gray-800">{label}</div>
                {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
            </div>
        </div>
        <ChevronRight size={16} className="text-gray-300" />
    </Link>
);