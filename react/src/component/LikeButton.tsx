import React, { useState } from "react";
import { Heart } from "lucide-react";
import api from "../conf/api";

type Props = {
    itemId: number;
    initialLiked: boolean; // 初期状態 (APIから取得した is_liked)
    initialCount?: number; // いいね数 (表示する場合)
    className?: string;
    size?: number;
};

export const LikeButton: React.FC<Props> = ({ itemId, initialLiked, initialCount = 0, className, size = 24 }) => {
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [count, setCount] = useState(initialCount);
    const [loading, setLoading] = useState(false);

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault(); // リンク遷移などを防ぐ
        e.stopPropagation();

        if (loading) return;
        setLoading(true);

        // オプティミスティックUI更新（APIを待たずに見た目を切り替える）
        const nextState = !isLiked;
        setIsLiked(nextState);
        setCount(prev => nextState ? prev + 1 : prev - 1);

        try {
            await api.post(`/flea-market/item/${itemId}/like`);
            // 成功時は何もしない (既に見た目は変わっている)
        } catch (error) {
            console.error(error);
            // 失敗したら元に戻す
            setIsLiked(!nextState);
            setCount(prev => !nextState ? prev + 1 : prev - 1);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            className={`flex items-center gap-1 transition-transform active:scale-90 ${className}`}
            disabled={loading}
        >
            <Heart
                size={size}
                className={`transition-colors ${isLiked ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-gray-500"}`}
            />
            {count > 0 && (
                <span className={`font-bold ${size > 24 ? "text-lg" : "text-xs"} ${isLiked ? "text-red-500" : "text-gray-400"}`}>
                    {count}
                </span>
            )}
        </button>
    );
};