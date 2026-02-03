import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../conf/api";
import { Loader2, ArrowUpCircle, ArrowDownCircle, Wallet, History, ChevronLeft } from "lucide-react";

import { Header } from "../../component/Header";
import ToastProvider from "../../component/ToastProvider"

import ExchangePointModal from "../../modal/ExchangePointModal";
import LoginModal from "../../modal/Login";
import PayoutModal from "../../modal/PayoutModal"

// 型定義
interface SalesHistoryItem {
    id: number;
    type: "SALE" | "WITHDRAWAL" | "ADJUSTMENT" | "EXCHANGE";
    amount: number;
    balance_snapshot: number;
    note: string;
    created_at: string;
}

interface SalesResponse {
    balance: number;
    histories: SalesHistoryItem[];
}

// 金額フォーマッター
const yen = (n: number) => new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(n);

// 日付フォーマッター
const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// タイプ名を日本語に変換
function formatType(type: string) {
    switch (type) {
        case "SALE": return "売上入金";
        case "WITHDRAWAL": return "振込出金";
        case "ADJUSTMENT": return "事務局調整";
        case "EXCHANGE": return "ポイント交換";
        default: return type;
    }
}

function SalesHistoryContent() {
    const navigate = useNavigate();
    const [data, setData] = useState<SalesResponse | null>(null);
    const [loading, setLoading] = useState(true);

    // モーダル管理とリロード用トリガー
    const [isExchangeModalOpen, setExchangeModalOpen] = useState(false);
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);


    // ログイン成功時の処理
    const handleLoginSuccess = () => {
        setLoginModalOpen(false);
        setReloadTrigger(prev => prev + 1); // useEffectを再発火させる
    };

    // 申請完了時の処理（データを再取得するなど）
    const handlePayoutSuccess = () => {
        fetchSales();
        console.log("Reloading data...");
    };

    // 売上データ取得関数
    const fetchSales = () => {
        setLoading(true);
        api.get("/flea-market/my/sales")
            .then((res) => setData(res.data))
            .catch((err) => {
                console.error(err);
                // APIエラーの内容によってはここでログインモーダルを出しても良い
            })
            .finally(() => setLoading(false));
    };

    // 初回ロード時にまずユーザー認証を確認する
    useEffect(() => {
        // Checkout.tsx と同じロジックでユーザー確認
        api.post("customer")
            .then((res) => {
                if (!res.data.user) {
                    // ユーザーがいない（未ログイン）場合
                    setLoginModalOpen(true);
                    setLoading(false); // ローディングを解除しないとモーダルが表示されないため
                } else {
                    // ログイン済みなら売上データを取得
                    fetchSales();
                }
            })
            .catch((err) => {
                console.error(err);
                setLoginModalOpen(true);
                setLoading(false);
            });
    }, [reloadTrigger]);

    const handleExchangeConfirm = async (amount: number) => {
        try {
            await api.post("/flea-market/my/sales/exchange", { amount });
            alert("交換が完了しました！");
            fetchSales(); // 残高・履歴を最新にする
        } catch (error) {
            console.error(error);
            alert("交換に失敗しました");
        }
    };

    // ローディング中かつ、ログインモーダルが開いていない場合のみローダーを表示
    // (ログインモーダルが開いているときは、後ろが真っ白でもモーダルを見せるため)
    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    // データがなく、かつログインモーダルも閉じていればエラー表示
    if (!data && !isLoginModalOpen) return <div className="p-4">データ取得エラー</div>;

    return (
        <>
            <Header />
            {/* データがある場合のみ中身を表示 (未ログイン時は data が null なので表示されない) */}
            {data && (
                <div className="max-w-2xl mx-auto p-4 space-y-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full">
                            <ChevronLeft size={24} className="text-gray-600" />
                        </button>
                        <Wallet className="text-blue-600" /> 売上・振込管理
                    </h1>

                    {/* --- 残高カード --- */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-lg">
                        <div className="text-blue-100 text-sm mb-1">現在の売上金残高</div>
                        <div className="text-4xl font-bold tracking-tight">¥{data.balance.toLocaleString()}</div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setIsPayoutModalOpen(true)}
                                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex-1"
                            >
                                振込申請する
                            </button>
                            <button
                                onClick={() => setExchangeModalOpen(true)}
                                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex-1"
                            >
                                ポイントに交換
                            </button>
                        </div>
                    </div>

                    {/* --- 履歴リスト --- */}
                    <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 font-bold text-gray-700 flex items-center gap-2">
                            <History size={18} /> 入出金履歴
                        </div>

                        {(!data.histories || data.histories.length === 0) ? (
                            <div className="p-8 text-center text-gray-400">履歴はまだありません</div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {/* 修正: mapする時も null だと落ちるので || [] をつける */}
                                {(data.histories || []).map((item) => (
                                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 ${item.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                                                {item.amount >= 0 ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800">{item.note || formatType(item.type)}</div>
                                                <div className="text-xs text-gray-500">{formatDate(item.created_at)}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-bold text-lg ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                {item.amount >= 0 ? "+" : ""}{yen(item.amount)}
                                            </div>
                                            <div className="text-xs text-gray-400">残高 {yen(item.balance_snapshot)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ポイント交換モーダル */}
            {data && (
                <>
                    <ExchangePointModal
                        isOpen={isExchangeModalOpen}
                        onClose={() => setExchangeModalOpen(false)}
                        maxAmount={data.balance}
                        onConfirm={handleExchangeConfirm}
                    />

                    <PayoutModal
                        isOpen={isPayoutModalOpen}
                        onClose={() => setIsPayoutModalOpen(false)}
                        onSuccess={handlePayoutSuccess}
                        currentBalance={data.balance}
                    />
                </>
            )}

            {/* ログインモーダル */}
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setLoginModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
                showCloseButton={true}
            />
        </>
    );
}

export default function SeleshistoryPage() {
    return (
        <ToastProvider>
            <SalesHistoryContent />
        </ToastProvider>
    );

}