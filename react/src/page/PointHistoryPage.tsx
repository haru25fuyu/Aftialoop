import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../conf/api";
import { Loader2, ArrowUpCircle, ArrowDownCircle, Coins, History, ChevronLeft } from "lucide-react"; // Walletの代わりにCoins
import { Header } from "../component/Header";
import LoginModal from "../modal/Login";

// 型定義 (ポイント用)
interface PointHistoryItem {
    id: number;
    type: "EARNED" | "CONSUMED" | "EXPIRED" | "ADJUSTMENT" | "EXCHANGE"; // 獲得, 使用, 期限切れ, 調整, 交換
    amount: number;
    balance_snapshot: number;
    note: string;
    created_at: string;
}

interface PointResponse {
    current_points: number; 
    histories: PointHistoryItem[];
}

// ポイントフォーマッター
const pt = (n: number | undefined) => `${(n ?? 0).toLocaleString()} pt`;

// 日付フォーマッター
const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// タイプ名を日本語に変換
function formatType(type: string) {
    switch (type) {
        case "EARNED": return "獲得";
        case "CONSUMED": return "利用";
        case "EXPIRED": return "有効期限切れ";
        case "EXCHANGE": return "売上金から交換";
        case "ADJUSTMENT": return "事務局調整";
        default: return type;
    }
}

export default function PointHistoryPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<PointResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    const [reloadTrigger, setReloadTrigger] = useState(0);

    const handleLoginSuccess = () => {
        setLoginModalOpen(false);
        setReloadTrigger(prev => prev + 1);
    };

    // ポイントデータ取得関数
    const fetchPoints = () => {
        setLoading(true);
        // ★APIのエンドポイントは適宜変更してください
        api.get("/point/my/history")
            .then((res) => setData(res.data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        api.post("customer")
            .then((res) => {
                if (!res.data.user) {
                    setLoginModalOpen(true);
                    setLoading(false);
                } else {
                    fetchPoints();
                }
            })
            .catch((err) => {
                console.error(err);
                setLoginModalOpen(true);
                setLoading(false);
            });
    }, [reloadTrigger]);

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    if (!data && !isLoginModalOpen) return <div className="p-4">データ取得エラー</div>;

    return (
        <>
            <Header />
            {data && (
                <div className="max-w-2xl mx-auto p-4 space-y-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full">
                            <ChevronLeft size={24} className="text-gray-600" />
                        </button>
                        <Coins className="text-orange-500" /> ポイント履歴
                    </h1>

                    {/* --- ポイント残高カード (オレンジ色に変更) --- */}
                    <div className="bg-gradient-to-br from-orange-400 to-orange-600 text-white p-6 rounded-2xl shadow-lg">
                        <div className="text-orange-50 text-sm mb-1">現在の保有ポイント</div>
                        <div className="text-4xl font-bold tracking-tight">
                            {pt(data.current_points)}
                        </div>

                        <div className="mt-2 text-xs text-orange-100 opacity-80">
                            ※ポイントは1pt=1円としてご利用いただけます
                        </div>
                    </div>

                    {/* --- 履歴リスト --- */}
                    <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 font-bold text-gray-700 flex items-center gap-2">
                            <History size={18} /> ポイント履歴
                        </div>

                        {(!data.histories || data.histories.length === 0) ? (
                            <div className="p-8 text-center text-gray-400">履歴はまだありません</div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {(data.histories || []).map((item) => (
                                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                                        <div className="flex items-start gap-3">
                                            {/* プラスはオレンジ、マイナスはグレーなどで表現 */}
                                            <div className={`mt-1 ${item.amount >= 0 ? "text-orange-500" : "text-gray-400"}`}>
                                                {item.amount >= 0 ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800">{item.note || formatType(item.type)}</div>
                                                <div className="text-xs text-gray-500">{formatDate(item.created_at)}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {/* 金額の色分け */}
                                            <div className={`font-bold text-lg ${item.amount >= 0 ? "text-orange-600" : "text-gray-600"}`}>
                                                {item.amount >= 0 ? "+" : ""}{pt(item.amount)}
                                            </div>
                                            <div className="text-xs text-gray-400">残高 {pt(item.balance_snapshot)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setLoginModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
                showCloseButton={true}
            />
        </>
    );
}