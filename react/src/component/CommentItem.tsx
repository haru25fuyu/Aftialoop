import { FleaComment } from "../types/Content";

import { CONFIG } from "../conf/config";

interface CommentItemProps {
    comment: FleaComment;
    sellerId: string;
}

export const CommentItem: React.FC<CommentItemProps> = ({ comment, sellerId }) => {
    const isSeller = comment.userId === sellerId;

    const user_icon = comment.userIcon
        ? CONFIG.BASE_URL + comment.userIcon
        : "/icons/default.png";

    const send_time = new Date(comment.createdAt).toLocaleString(
        undefined,
        {
            hour: "2-digit",
            minute: "2-digit",
        }
    );


    return (
        <div className={`flex w-full min-w-0 mb-6 ${isSeller ? "justify-end" : "justify-start"}`}>
            {/* 左側：購入者アイコン */}
            {!isSeller && (
                <img
                    src={user_icon}
                    alt={comment.userName}
                    className="w-8 h-8 rounded-full mr-2 object-cover shrink-0"
                />
            )}

            <div className={`relative min-w-0 max-w-[240px] ${isSeller ? "text-right" : "text-left"}`}>
                {/* 名前 */}
                <p className="text-sm font-medium text-gray-800 mb-1 break-words">
                    {comment.userName}
                </p>

                {/* 吹き出し */}
                <div
                    className={
                        `px-4 py-2 text-sm whitespace-pre-wrap break-words rounded-xl ` +
                        (isSeller
                            ? "bg-blue-100 text-blue-900 rounded-tr-sm ml-auto"
                            : "bg-gray-100 text-gray-800 rounded-tl-sm"
                        )
                    }
                >
                    {comment.body}
                </div>

                {/* 時間 */}
                <p className="text-xs text-gray-400 mt-1">
                    {send_time}
                </p>
            </div>

            {/* 右側：出品者アイコン */}
            {isSeller && (
                <img
                    src={user_icon}
                    alt={comment.userName}
                    className="w-8 h-8 rounded-full ml-2 object-cover shrink-0"
                />
            )}
        </div>
    );
};

export default CommentItem;