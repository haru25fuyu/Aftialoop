import React from "react";
import { Avatar } from "./Avatar";
import { s } from "../styles/component/CommentList.styles";

type Comment = { id: string; userId: string; userName: string; userIcon: string; body: string; createdAt: number; isSeller?: boolean; };
type Props = { comments: Comment[]; sellerId?: string; };

const CommentList: React.FC<Props> = ({ comments, sellerId }) => {
  if (!comments.length) return <div style={s.emptyState}>コメントはまだありません</div>;
  return (
    <div style={s.list}>
      {comments.map((c) => {
        const isSeller = c.userId === sellerId;
        return (
          <div key={c.id} style={s.item}>
            <Avatar src={c.userIcon} name={c.userName} size={36} />
            <div style={s.bubbleWrap(isSeller)}>
              <div style={s.meta}>
                {c.userName}
                {isSeller && <span style={s.sellerBadge}>出品者</span>}
                　{new Date(c.createdAt).toLocaleDateString()}
              </div>
              <div style={s.bubble(isSeller)}>{c.body}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CommentList;
