import React, { useEffect, useRef } from "react";


import CommentItem from "./CommentItem";
import { FleaComment } from "../types/Content";

interface CommentListProps {
    comments: FleaComment[];
    sellerId: string;
}

const dateKey = (ms: number) => {
    const d = new Date(ms);
    // ローカル日付で揃える（JSTでOK）
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const dateLabel = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
    });

const CommentList: React.FC<CommentListProps> = ({ comments, sellerId }) => {
    const bottomRef = useRef<HTMLDivElement | null>(null);
    // 初回表示 & comments更新時に一番下へ
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }, [comments]);

    if (!comments || comments.length === 0) {
        return <p className="h-full overflow-y-auto px-2">コメントはありません</p>;
    }

    // 念のため時系列ソート（APIが保証してるなら不要）
    const sorted = [...comments].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

    let prevKey: string | null = null;

    return (
        <div className="h-full overflow-y-auto px-2">
            {sorted.map((c) => {
                const key = dateKey(c.createdAt);
                const showHeader = key !== prevKey;
                prevKey = key;

                return (
                    <div key={c.id}>
                        {showHeader && (
                            <div className="flex justify-center my-4">
                                <span className="px-3 py-1 text-xs text-gray-600 bg-gray-200 rounded-full">
                                    {dateLabel(c.createdAt)}
                                </span>
                            </div>
                        )}
                        <CommentItem comment={c} sellerId={sellerId} />
                    </div>
                );
            })}
            <div ref={bottomRef} />
        </div>
    );

};

export default CommentList;
