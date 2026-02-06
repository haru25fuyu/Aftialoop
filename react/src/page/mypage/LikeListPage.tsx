import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Heart, Package } from "lucide-react";
import { Header } from "../../component/Header";
import { LikeButton } from "../../component/LikeButton";
import api from "../../conf/api";
import { CONFIG } from "../../conf/config";

interface LikedItem {
    id: number;
    name: string;
    price: number;
    main_image_url: string;
    seller_name: string;
    is_liked: boolean;
}

export default function LikeListPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<LikedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const limit = 20;

    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement | null) => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setOffset(prev => prev + limit);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    useEffect(() => {
        const fetchItems = async () => {
            if (offset === 0) setLoading(true);
            else setLoadingMore(true);

            try {
                // APIにlimit/offsetを渡す
                const res = await api.get(`/mypage/likes?limit=${limit}&offset=${offset}`);
                const newItems = res.data || [];

                setItems(prev => {
                    const existingIds = new Set(prev.map(i => i.id));
                    const uniqueNew = newItems.filter((i: LikedItem) => !existingIds.has(i.id));
                    return [...prev, ...uniqueNew];
                });

                if (newItems.length < limit) {
                    setHasMore(false);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        };
        fetchItems();
    }, [offset]);

    return (
        <>
            <Header />
            <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
                <div className="bg-white p-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-10">
                    <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full">
                        <ChevronLeft size={24} className="text-gray-600" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-800">いいね！した商品</h1>
                </div>

                <div className="p-2">
                    <div className="grid grid-cols-2 gap-2">
                        {items.map((item, index) => (
                            <div
                                ref={index === items.length - 1 ? lastElementRef : null}
                                key={`${item.id}-${index}`}
                                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 relative group"
                            >
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

                                    <div className="absolute bottom-2 right-2">
                                        <LikeButton
                                            itemId={item.id}
                                            initialLiked={true}
                                            size={24}
                                            className="bg-white p-1.5 rounded-full shadow-sm bg-opacity-90"
                                        />
                                    </div>
                                </Link>

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

                {loading && (
                    <div className="p-10 text-center text-gray-400">読み込み中...</div>
                )}
                {loadingMore && (
                    <div className="py-4 text-center text-gray-400 text-sm">読み込み中...</div>
                )}

                {!loading && !loadingMore && items.length === 0 && (
                    <div className="p-10 text-center flex flex-col items-center gap-4 mt-10">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                            <Heart size={32} />
                        </div>
                        <p className="text-gray-500 font-bold">まだいいね！した商品はありません</p>
                        <Link to="/flea-market" className="text-blue-500 text-sm font-bold mt-2">
                            商品を探しに行く
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
}