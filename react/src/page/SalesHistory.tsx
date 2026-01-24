import React, { useEffect, useState } from "react";
import api from "../conf/api";
import { Loader2, ArrowUpCircle, ArrowDownCircle, Wallet, History } from "lucide-react";
import { Header } from "../component/Header";

// 型定義
interface SalesHistoryItem {
    id: number;
    type: "SALE" | "WITHDRAWAL" | "ADJUSTMENT";
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

export default function SalesHistoryPage() {
    const [data, setData] = useState<SalesResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/flea-market/my/sales")
            .then((res) => setData(res.data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!data) return <div className="p-4">データ取得エラー</div>;

    return (
        <>
            <Header />
            <div className="max-w-2xl mx-auto p-4 space-y-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Wallet className="text-blue-600" /> 売上・振込管理
                </h1>

                {/* --- 残高カード --- */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-lg">
                    <div className="text-blue-100 text-sm mb-1">現在の売上金残高</div>
                    <div className="text-4xl font-bold tracking-tight">{yen(data.balance)}</div>

                    <div className="mt-6 flex gap-3">
                        <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex-1">
                            振込申請する
                        </button>
                        <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex-1">
                            ポイントに交換
                        </button>
                    </div>
                </div>

                {/* --- 履歴リスト --- */}
                <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 font-bold text-gray-700 flex items-center gap-2">
                        <History size={18} /> 入出金履歴
                    </div>

                    {data.histories.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">履歴はまだありません</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {data.histories.map((item) => (
                                <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                                    <div className="flex items-start gap-3">
                                        {/* アイコン: 売上なら上矢印(緑)、出金なら下矢印(赤) */}
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
        </>
    );
}

// タイプ名を日本語に変換
function formatType(type: string) {
    switch (type) {
        case "SALE": return "売上入金";
        case "WITHDRAWAL": return "振込出金";
        case "ADJUSTMENT": return "事務局調整";
        default: return type;
    }
}