import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Package, ShoppingCart, Store, CheckCircle, XCircle, ShoppingBag } from "lucide-react";
// import { Header } from "../component/Header"; // ★削除: サブページなので共通ヘッダーは外してスッキリさせる
import api from "../conf/api";
import { CONFIG } from "../conf/config";

// --- 型定義 ---
interface FleaTransaction {
    id: number;
    type: 'flea';
    item_name: string;
    item_image_url: string;
    price: number;
    status: string;
    is_seller: boolean;
    updated_at: string;
}

interface EcOrder {
    id: number;
    type: 'ec';
    first_item_name: string;
    first_item_image: string;
    total_amount: number;
    item_count: number;
    status: string;
    created_at: string;
}

type HistoryItem = FleaTransaction | EcOrder;

export default function HistoryPage() {
    const navigate = useNavigate();

    // 大カテゴリー: 'flea' | 'ec'
    const [serviceTab, setServiceTab] = useState<'flea' | 'ec'>('flea');
    // フリマ用サブタブ: 'buyer' | 'seller'
    const [fleaRoleTab, setFleaRoleTab] = useState<'buyer' | 'seller'>('buyer');

    const [fleaItems, setFleaItems] = useState<FleaTransaction[]>([]);
    const [ecItems, setEcItems] = useState<EcOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [resFlea, resEc] = await Promise.all([
                    api.get("/mypage/transactions/history"),
                    api.get("/mypage/orders/history").catch(() => ({ data: [] })) // エラー回避
                ]);

                const fItems = (resFlea.data || []).map((i: FleaTransaction) => ({ ...i, type: 'flea' }));
                const eItems = (resEc.data || []).map((i: EcOrder) => ({ ...i, type: 'ec' }));

                setFleaItems(fItems);
                setEcItems(eItems);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // フィルタリング
    let displayItems: HistoryItem[] = [];
    if (serviceTab === 'flea') {
        displayItems = fleaItems.filter(item =>
            fleaRoleTab === 'seller' ? item.is_seller : !item.is_seller
        );
    } else {
        displayItems = ecItems;
    }

    // ステータスバッジ（フリマ用）
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "COMPLETED": return { label: "完了", color: "bg-gray-100 text-gray-500", icon: <CheckCircle size={12} /> };
            case "CANCELLED": return { label: "キャンセル", color: "bg-red-50 text-red-400", icon: <XCircle size={12} /> };
            default: return { label: status, color: "bg-gray-100 text-gray-500", icon: null };
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* ★修正: max-w-md を max-w-4xl に拡張し、スマホ以外でも見やすく */}
            <div className="max-w-4xl mx-auto bg-gray-50 min-h-screen">

                {/* ヘッダーエリア */}
                <div className="bg-white sticky top-0 z-20 shadow-sm">
                    <div className="p-4 flex items-center gap-4 border-b border-gray-100">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronLeft size={24} className="text-gray-600" />
                        </button>
                        <h1 className="text-lg font-bold text-gray-800">購入・取引履歴</h1>
                    </div>

                    {/* 大タブ (サービス切り替え) */}
                    <div className="p-3 px-4 flex gap-3 bg-gray-50 border-b border-gray-200">
                        <button
                            onClick={() => setServiceTab('flea')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${serviceTab === 'flea'
                                    ? "bg-white text-blue-600 shadow ring-1 ring-black/5"
                                    : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                                }`}
                        >
                            フリマ
                        </button>
                        <button
                            onClick={() => setServiceTab('ec')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${serviceTab === 'ec'
                                    ? "bg-white text-emerald-600 shadow ring-1 ring-black/5"
                                    : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                                }`}
                        >
                            公式ストア
                        </button>
                    </div>

                    {/* フリマ用サブタブ */}
                    {serviceTab === 'flea' && (
                        <div className="flex border-b border-gray-200 bg-white">
                            <button
                                onClick={() => setFleaRoleTab('buyer')}
                                className={`flex-1 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-2 relative transition-colors ${fleaRoleTab === 'buyer' ? "text-blue-600 bg-blue-50/50" : "text-gray-400 hover:bg-gray-50"
                                    }`}
                            >
                                <ShoppingCart size={16} /> 購入した商品
                                {fleaRoleTab === 'buyer' && <div className="absolute bottom-0 h-0.5 w-full bg-blue-600"></div>}
                            </button>
                            <button
                                onClick={() => setFleaRoleTab('seller')}
                                className={`flex-1 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-2 relative transition-colors ${fleaRoleTab === 'seller' ? "text-blue-600 bg-blue-50/50" : "text-gray-400 hover:bg-gray-50"
                                    }`}
                            >
                                <Store size={16} /> 出品した商品
                                {fleaRoleTab === 'seller' && <div className="absolute bottom-0 h-0.5 w-full bg-blue-600"></div>}
                            </button>
                        </div>
                    )}
                </div>

                {/* リスト表示エリア */}
                <div className="p-4">
                    {loading ? (
                        <div className="p-20 text-center text-gray-400">読み込み中...</div>
                    ) : displayItems.length === 0 ? (
                        <div className="p-10 text-center flex flex-col items-center gap-4 mt-10">
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                                <Package size={32} />
                            </div>
                            <p className="text-gray-500 font-bold">履歴はありません</p>
                        </div>
                    ) : (
                        // ★修正: PCでは2列グリッド (md:grid-cols-2)、スマホでは1列
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {displayItems.map((item) => {
                                // --- フリマの場合 ---
                                if (item.type === 'flea') {
                                    const badge = getStatusBadge(item.status);
                                    return (
                                        <Link key={`flea-${item.id}`} to={`/flea-market/transactions/${item.id}`}
                                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex gap-4 items-center group">
                                            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-100 relative">
                                                {item.item_image_url ? (
                                                    <img src={CONFIG.BASE_URL + item.item_image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={24} /></div>
                                                )}
                                                {/* 完了済みなら少し暗くする演出 */}
                                                <div className="absolute inset-0 bg-black/5"></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-gray-700 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                        {item.item_name}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${badge.color}`}>
                                                        {badge.icon} {badge.label}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <span className="font-bold text-gray-900">¥{item.price.toLocaleString()}</span>
                                                    <span className="text-xs text-gray-400">{new Date(item.updated_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                }
                                // --- ECの場合 ---
                                else {
                                    return (
                                        <Link key={`ec-${item.id}`} to={`/orders/${item.id}`}
                                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex gap-4 items-center group">
                                            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                                                {item.first_item_image && <img src={CONFIG.BASE_URL + item.first_item_image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-700 text-sm line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                                    {item.first_item_name}
                                                </h3>
                                                {item.item_count > 1 && (
                                                    <p className="text-xs text-gray-400 mt-0.5">他 {item.item_count - 1} 点</p>
                                                )}
                                                <div className="mt-2 flex justify-between items-end">
                                                    <div>
                                                        <div className="text-xs text-gray-400 mb-0.5">支払金額</div>
                                                        <span className="font-bold text-gray-900 text-lg">¥{item.total_amount.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-md">
                                                        <ShoppingBag size={12} /> 公式ストア
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                }
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}