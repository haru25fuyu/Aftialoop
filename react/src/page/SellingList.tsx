import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Tag } from "lucide-react";
import { Header } from "../component/Header"; // パスは環境に合わせて調整してください
import api from "../conf/api";
import { ListingItem } from "../types/FleaMarket";
import { CONFIG } from "../conf/config";

export default function SellingListPage() {
    const [items, setItems] = useState<ListingItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/flea-market/selling/list?limit=20&offset=0")
            .then((res) => setItems(res.data.items || []))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    // ステータスバッジの表示ロジック
    const getStatusBadge = (status: number) => {
        switch (status) {
            case 1: return <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded">出品中</span>;
            case 2: return <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded">取引中</span>;
            case 3: return <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded">売却済</span>;
            default: return null;
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />
            <div className="max-w-2xl mx-auto p-4 space-y-6">
                <div className="flex items-center gap-2 mt-4">
                    <Tag className="text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-800">出品した商品</h1>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-gray-400">読み込み中...</div>
                ) : items.length === 0 ? (
                    <div className="p-10 text-center bg-white rounded-xl border border-gray-200 text-gray-500 shadow-sm">
                        出品履歴はありません
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map((item) => (
                            <Link
                                to={`/flea-market/item/${item.id}`}
                                key={item.id}
                                className="block bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition group"
                            >
                                <div className="flex gap-4">
                                    {/* 画像 */}
                                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden relative">
                                        <img src={CONFIG.BASE_URL + item.main_image_url} alt="" className="w-full h-full object-cover" />
                                        {item.status >= 2 && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <span className="text-white font-bold text-xs">SOLD</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 詳細 */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-gray-800 line-clamp-2">{item.name}</h3>
                                            {getStatusBadge(item.status)}
                                        </div>
                                        <div className="mt-2 text-lg font-bold text-gray-900">
                                            ¥{item.price.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            出品日: {new Date(item.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="flex items-center text-gray-300 group-hover:text-blue-500 transition">
                                        <ChevronRight />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}