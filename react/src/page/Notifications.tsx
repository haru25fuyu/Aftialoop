import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Bell, Info, MessageCircle, ShoppingBag } from "lucide-react";
import Header from "../component/Header";
import api from "../conf/api";

type Notification = {
    id: number;
    type: "OFFICIAL" | "TRANSACTION" | "COMMENT";
    title: string;
    body: string;
    url: string;
    is_read: boolean;
    created_at: string;
};

export default function NotificationsPage() {
    const [items, setItems] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [filter, setFilter] = useState<"ALL" | "OFFICIAL" | "PERSONAL">("ALL");

    const [loadingMore, setLoadingMore] = useState(false);

    const limit = 20;

    // 無限スクロール用
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLAnchorElement | null) => {
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
        const fetchNotifs = async () => {
            if (offset === 0) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            try {
                const res = await api.get(`/notifications?limit=${limit}&offset=${offset}`);
                const newItems = res.data.items || [];

                setItems(prev => {
                    const exists = new Set(prev.map(i => i.id));
                    const filtered = newItems.filter((i: Notification) => !exists.has(i.id));
                    return offset === 0 ? newItems : [...prev, ...filtered];
                });

                if (newItems.length < limit) setHasMore(false);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        };
        fetchNotifs();
    }, [offset]);

    // フィルタリング（クライアントサイドで簡易的に行う例）
    // 本格的にやるならAPIにtypeパラメータを渡す
    const displayItems = items.filter(item => {
        if (filter === "ALL") return true;
        if (filter === "OFFICIAL") return item.type === "OFFICIAL";
        if (filter === "PERSONAL") return item.type !== "OFFICIAL";
        return true;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case "OFFICIAL": return <Info size={20} className="text-blue-500" />;
            case "TRANSACTION": return <ShoppingBag size={20} className="text-emerald-500" />;
            case "COMMENT": return <MessageCircle size={20} className="text-orange-500" />;
            default: return <Bell size={20} className="text-gray-500" />;
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />
            <div className="max-w-2xl mx-auto p-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Bell className="text-emerald-600" /> お知らせ
                </h1>

                {/* タブ */}
                <div className="flex gap-2 mb-6 border-b border-gray-200 pb-1">
                    <button onClick={() => setFilter("ALL")} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition ${filter === "ALL" ? "border-b-2 border-emerald-500 text-emerald-600" : "text-gray-500"}`}>すべて</button>
                    <button onClick={() => setFilter("PERSONAL")} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition ${filter === "PERSONAL" ? "border-b-2 border-emerald-500 text-emerald-600" : "text-gray-500"}`}>あなたへ</button>
                    <button onClick={() => setFilter("OFFICIAL")} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition ${filter === "OFFICIAL" ? "border-b-2 border-emerald-500 text-emerald-600" : "text-gray-500"}`}>運営より</button>
                </div>

                <div className="space-y-3">
                    {displayItems.length > 0 ? (
                        displayItems.map((item, index) => (
                            <Link
                                to={item.url}
                                key={item.id}
                                ref={index === displayItems.length - 1 ? lastElementRef : null}
                                className={`block p-4 rounded-xl border transition hover:shadow-md ${item.is_read ? "bg-white border-gray-100" : "bg-red-50/30 border-red-100"}`}
                            >
                                <div className="flex gap-4">
                                    <div className="shrink-0 mt-1">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                            {getIcon(item.type)}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm font-bold text-gray-900 mb-1">{item.title}</p>
                                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2">{item.body}</p>
                                    </div>
                                    {!item.is_read && (
                                        <div className="shrink-0 self-center">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))
                    ) : (
                        !loading && <div className="p-10 text-center text-gray-400">お知らせはありません</div>
                    )}

                    {loading && <div className="p-10 text-center text-gray-400">読み込み中...</div>}
                </div>
            </div>
        </div>
    );
}