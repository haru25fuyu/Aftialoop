import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft, ChevronRight, ShieldCheck, Mail, Lock,
    Smartphone, Bell, Ban, HelpCircle, FileText, AlertTriangle,
    LogOut, CheckCircle2, AlertCircle
} from "lucide-react";
import { Header } from "../../component/Header"; // ヘッダーがある場合
import api from "../../conf/api";

// 設定画面用のユーザーステータス型
interface UserSettingsStatus {
    email: string;
    is_identity_verified: boolean; // 本人確認済みか
    is_phone_verified: boolean;    // 電話番号認証済みか
    has_password: boolean;         // パスワード設定済みか（ソーシャルログインのみの場合はfalse想定）
}

export default function Settings() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<UserSettingsStatus | null>(null);


    // 初期ロード：ステータス取得（本人確認バッジなどのため）
    useEffect(() => {
        api.post("/customer/data").then((res) => {
            setStatus({
                email: res.data.email,
                is_identity_verified: res.data.identity_status === "APPROVED",
                is_phone_verified: res.data.phone !== null && res.data.phone !== "",
                has_password: res.data.password !== null && res.data.password !== "",
            });
        });

        
    }, []);

    if (!status) return <div className="p-10 text-center">Loading...</div>;

    return (
        <>
            <Header />
            <div className="min-h-screen bg-[#f8f9fa] pb-20">
                {/* ヘッダー (戻るボタン付き) */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-lg mx-auto h-14 px-4 flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-1 -ml-2 hover:bg-gray-100 rounded-full">
                            <ArrowLeft size={24} className="text-gray-600" />
                        </button>
                        <h1 className="font-bold text-lg">設定</h1>
                    </div>
                </div>

                <main className="max-w-lg mx-auto p-4 space-y-6">

                    {/* --- 1. アカウント・セキュリティ --- */}
                    <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                        <h2 className="text-xs font-bold text-gray-400 mb-2 ml-1">アカウント・セキュリティ</h2>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">

                            {/* 本人確認 (重要なので一番上) */}
                            <Link to="/mypage/settings/identity" className="flex items-center justify-between p-4 hover:bg-gray-50 transition group">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck size={20} className={status.is_identity_verified ? "text-green-500" : "text-gray-400"} />
                                    <div>
                                        <div className="text-sm font-medium text-gray-800">本人確認</div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            {status.is_identity_verified ? (
                                                <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={10} /> 完了済み</span>
                                            ) : (
                                                <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> 未完了（出品・振込に必要）</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </Link>

                            {/* メールアドレス */}
                            <Link to="/mypage/settings/email" className="flex items-center justify-between p-4 hover:bg-gray-50 transition group">
                                <div className="flex items-center gap-3">
                                    <Mail size={20} className="text-gray-400" />
                                    <div>
                                        <div className="text-sm font-medium text-gray-800">メールアドレス変更</div>
                                        <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{status.email}</div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </Link>

                            {/* 電話番号認証 */}
                            <Link to="/mypage/settings/phone" className="flex items-center justify-between p-4 hover:bg-gray-50 transition group">
                                <div className="flex items-center gap-3">
                                    <Smartphone size={20} className="text-gray-400" />
                                    <div>
                                        <div className="text-sm font-medium text-gray-800">電話番号の確認</div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            {status.is_phone_verified ? "認証済み" : "未設定"}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </Link>

                            {/* パスワード */}
                            {status.has_password && (
                                <Link to="/mypage/settings/password" className="flex items-center justify-between p-4 hover:bg-gray-50 transition group">
                                    <div className="flex items-center gap-3">
                                        <Lock size={20} className="text-gray-400" />
                                        <div className="text-sm font-medium text-gray-800">パスワード変更</div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300" />
                                </Link>
                            )}
                        </div>
                    </section>

                    {/* --- 2. 機能・設定 --- */}
                    <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                        <h2 className="text-xs font-bold text-gray-400 mb-2 ml-1">機能・設定</h2>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">
                            <Link to="/mypage/settings/notification" className="flex items-center justify-between p-4 hover:bg-gray-50 transition group">
                                <div className="flex items-center gap-3">
                                    <Bell size={20} className="text-gray-400" />
                                    <div className="text-sm font-medium text-gray-800">お知らせ・通知設定</div>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </Link>
                            <Link to="/mypage/settings/blocked" className="flex items-center justify-between p-4 hover:bg-gray-50 transition group">
                                <div className="flex items-center gap-3">
                                    <Ban size={20} className="text-gray-400" />
                                    <div className="text-sm font-medium text-gray-800">ブロックしたユーザー</div>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </Link>
                        </div>
                    </section>

                    {/* --- 3. サポート・規約 --- */}
                    <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                        <h2 className="text-xs font-bold text-gray-400 mb-2 ml-1">サポート・規約</h2>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">
                            <Link to="/contact" className="flex items-center justify-between p-4 hover:bg-gray-50 transition group">
                                <div className="flex items-center gap-3">
                                    <HelpCircle size={20} className="text-gray-400" />
                                    <div className="text-sm font-medium text-gray-800">ヘルプ・お問い合わせ</div>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </Link>

                            {/* 法的表示関係 */}
                            <Link to="/terms" className="flex items-center justify-between p-4 hover:bg-gray-50 transition group">
                                <div className="flex items-center gap-3">
                                    <FileText size={20} className="text-gray-400" />
                                    <div className="text-sm font-medium text-gray-800">利用規約</div>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </Link>
                            <Link to="/privacy" className="flex items-center justify-between p-4 hover:bg-gray-50 transition group">
                                <div className="flex items-center gap-3">
                                    <FileText size={20} className="text-gray-400" />
                                    <div className="text-sm font-medium text-gray-800">プライバシーポリシー</div>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </Link>
                            <Link to="/tokusho" className="flex items-center justify-between p-4 hover:bg-gray-50 transition group">
                                <div className="flex items-center gap-3">
                                    <FileText size={20} className="text-gray-400" />
                                    <div className="text-sm font-medium text-gray-800">特定商取引法に基づく表記</div>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </Link>
                        </div>
                    </section>

                    {/* --- 4. その他（ログアウト・退会） --- */}
                    <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">
                            {/* ログアウト */}
                            <button
                                onClick={() => {
                                    if (window.confirm("ログアウトしますか？")) {
                                        api.post("/logout").then(() => window.location.href = "/");
                                    }
                                }}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-gray-700"
                            >
                                <div className="flex items-center gap-3">
                                    <LogOut size={20} className="text-gray-400" />
                                    <div className="text-sm font-medium">ログアウト</div>
                                </div>
                            </button>

                            {/* 退会 */}
                            <Link to="/mypage/settings/delete" className="flex items-center justify-between p-4 hover:bg-red-50 transition group">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle size={20} className="text-red-400" />
                                    <div className="text-sm font-medium text-red-500">退会する</div>
                                </div>
                                <ChevronRight size={16} className="text-red-200" />
                            </Link>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-6 mb-10">Version 1.0.0</p>
                    </section>

                </main>
            </div>
        </>
    );
}