import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Package, MessageCircle, ShoppingCart, Store } from "lucide-react";
import { Header } from "../../component/Header";
import api from "../../conf/api";
import { CONFIG } from "../../conf/config";

interface TransactionItem {
    id: number;
    pr_id : number;
    item_name: string;
    item_image_url: string;
    price: number;
    status: string;
    is_seller: boolean;
    updated_at: string;
}

export default function ActiveTransactionListPage() {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'buyer' | 'seller'>('buyer');

    useEffect(() => {
        api.get("/mypage/transactions/active")
            .then((res) => {
                setTransactions(res.data || []);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const hasBuyerItems = transactions.some(tx => !tx.is_seller);
    const hasSellerItems = transactions.some(tx => tx.is_seller);

    const filteredTransactions = transactions.filter(tx =>
        activeTab === 'seller' ? tx.is_seller : !tx.is_seller
    );

    // バッジなどのヘルパー関数は省略（変更なし）
    const getStatusBadge = (status: string, isSeller: boolean) => {
        switch (status) {
            case "ACCEPTED": return { label: "支払い待ち", color: "bg-gray-100 text-gray-600 border-gray-200" };
            case "PAID": return isSeller
                ? { label: "発送してください", color: "bg-red-50 text-red-600 border-red-200" }
                : { label: "発送待ち", color: "bg-blue-50 text-blue-600 border-blue-200" };
            case "SHIPPED": return isSeller
                ? { label: "受取評価待ち", color: "bg-blue-50 text-blue-600 border-blue-200" }
                : { label: "受取評価してください", color: "bg-red-50 text-red-600 border-red-200" };
            case "RATED_BY_BUYER": return isSeller
                ? { label: "評価してください", color: "bg-red-50 text-red-600 border-red-200" }
                : { label: "相手の評価待ち", color: "bg-blue-50 text-blue-600 border-blue-200" };
            default: return { label: "進行中", color: "bg-gray-100 text-gray-500 border-gray-200" };
        }
    };

    return (
        <>
            <Header />
            <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
                <div className="bg-white sticky top-0 z-10 shadow-sm">
                    <div className="p-4 flex items-center gap-4 border-b border-gray-100">
                        <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full">
                            <ChevronLeft size={24} className="text-gray-600" />
                        </button>
                        <h1 className="text-lg font-bold text-gray-800">取引中の商品</h1>
                    </div>

                    <div className="flex border-b border-gray-200">
                        {/* 購入タブ */}
                        <button
                            onClick={() => setActiveTab('buyer')}
                            // ★修正: gap-2 を削除 (中のdivでやるため)
                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-all relative ${activeTab === 'buyer' ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            {/* ★修正: アイコンと文字をラップするdivを追加し、ここに relative をつける */}
                            <div className="relative flex items-center gap-2">
                                <ShoppingCart size={18} />
                                <span>購入した商品</span>

                                {/* ★修正: 親のdivを基準に配置 (-top-1 -right-2) */}
                                {hasBuyerItems && (
                                    <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                                )}
                            </div>

                            {activeTab === 'buyer' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full mx-4"></div>
                            )}
                        </button>

                        {/* 出品タブ */}
                        <button
                            onClick={() => setActiveTab('seller')}
                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-all relative ${activeTab === 'seller' ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            {/* ★修正: ラッパーdiv */}
                            <div className="relative flex items-center gap-2">
                                <Store size={18} />
                                <span>出品した商品</span>

                                {/* ★修正: バッジ位置 */}
                                {hasSellerItems && (
                                    <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                                )}
                            </div>

                            {activeTab === 'seller' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full mx-4"></div>
                            )}
                        </button>
                    </div>
                </div>

                {/* リスト表示エリア (変更なし) */}
                {loading ? (
                    <div className="p-10 text-center text-gray-400">読み込み中...</div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center gap-4 mt-10">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                            {activeTab === 'buyer' ? <ShoppingCart size={32} /> : <Store size={32} />}
                        </div>
                        <p className="text-gray-500 font-bold">
                            {activeTab === 'buyer' ? "購入した進行中の商品はありません" : "出品した進行中の商品はありません"}
                        </p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {filteredTransactions.map((tx) => {
                            const badge = getStatusBadge(tx.status, tx.is_seller);
                            return (
                                <Link
                                    key={tx.id}
                                    to={`/flea-market/transactions/${tx.pr_id}`}
                                    className="block bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition active:scale-[0.99]"
                                >
                                    <div className="flex gap-4">
                                        <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100 relative">
                                            {tx.item_image_url ? (
                                                <img
                                                    src={tx.item_image_url.startsWith("http") ? tx.item_image_url : CONFIG.BASE_URL + tx.item_image_url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <Package size={24} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                            <div>
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="font-bold text-gray-800 text-sm line-clamp-1 flex-1">
                                                        {tx.item_name}
                                                    </h3>
                                                </div>
                                                <div className="mt-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-2">
                                                <span className="font-bold text-gray-800">¥{tx.price.toLocaleString()}</span>
                                                <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                                    <MessageCircle size={12} />
                                                    <span>取引画面へ</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}