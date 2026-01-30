import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Heart, Package } from "lucide-react";
import { Header } from "../component/Header";
import { LikeButton } from "../component/LikeButton"; // さっき作ったやつ！
import api from "../conf/api";
import { CONFIG } from "../conf/config";

// 型定義 (FleaMarketListLiteに対応)
interface LikedItem {
    id: number;
    name: string;
    price: number;
    main_image_url: string;
    seller_name: string;
    is_liked: boolean;
    // 売り切れ表示用などがAPIに含まれていれば追加
}

export default function LikeListPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<LikedItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/mypage/likes")
            .then((res) => {
                setItems(res.data || []);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <>
            <Header />
            <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
                {/* ヘッダー */}
                <div className="bg-white p-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-10">
                    <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full">
                        <ChevronLeft size={24} className="text-gray-600" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-800">いいね！した商品</h1>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-gray-400">読み込み中...</div>
                ) : items.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center gap-4 mt-10">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                            <Heart size={32} />
                        </div>
                        <p className="text-gray-500 font-bold">まだいいね！した商品はありません</p>
                        <Link to="/flea-market" className="text-blue-500 text-sm font-bold mt-2">
                            商品を探しに行く
                        </Link>
                    </div>
                ) : (
                    <div className="p-2">
                        {/* 2列グリッド表示 */}
                        <div className="grid grid-cols-2 gap-2">
                            {items.map((item) => (
                                <div key={item.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 relative group">
                                    {/* 画像エリア */}
                                    <Link to={`/flea-market/item/${item.id}`} className="block aspect-square bg-gray-100 relative">
                                        {item.main_image_url ? (
                                            <img
                                                src={item.main_image_url.startsWith("http") ? item.main_image_url : CONFIG.BASE_URL + item.main_image_url}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <Package size={24} />
                                            </div>
                                        )}

                                        {/* ここでLikeButtonを使う！ */}
                                        <div className="absolute bottom-2 right-2">
                                            <LikeButton
                                                itemId={item.id}
                                                initialLiked={true} // ここは必ずtrue
                                                size={24}
                                                className="bg-white p-1.5 rounded-full shadow-sm bg-opacity-90"
                                            />
                                        </div>
                                    </Link>

                                    {/* 情報エリア */}
                                    <Link to={`/flea-market/item/${item.id}`} className="block p-3">
                                        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 h-10 mb-1">
                                            {item.name}
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <p className="text-base font-bold text-gray-900">
                                                ¥{item.price.toLocaleString()}
                                            </p>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}