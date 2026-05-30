import React from "react";
import { FleaComment } from "../types/FleaMarket";
import { Avatar } from "./Avatar";
import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../styles/tokens";

interface Props { comment: FleaComment; sellerId: string; }

export const CommentItem: React.FC<Props> = ({ comment, sellerId }) => {
  const isSeller = comment.userId === sellerId;
  const send_time = new Date(comment.createdAt).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "flex", width: "100%", minWidth: 0, marginBottom: spacing[6], justifyContent: isSeller ? "flex-end" : "flex-start" }}>
      {!isSeller && <Avatar src={comment.userIcon} name={comment.userName} size={32} />}
      <div style={{ position: "relative", minWidth: 0, maxWidth: 240, textAlign: isSeller ? "right" : "left", marginLeft: isSeller ? 0 : spacing[2], marginRight: isSeller ? spacing[2] : 0 }}>
        <p style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: semantic.textPrimary, marginBottom: spacing[1], wordBreak: "break-word" }}>{comment.userName}</p>
        <div style={{ padding: `${spacing[2]}px ${spacing[4]}px`, fontSize: fontSize.sm, whiteSpace: "pre-wrap", wordBreak: "break-word", borderRadius: radius.xl, backgroundColor: isSeller ? colors.infoBg : colors.neutral100, color: isSeller ? colors.info : semantic.textPrimary, borderTopRightRadius: isSeller ? 4 : radius.xl, borderTopLeftRadius: isSeller ? radius.xl : 4, marginLeft: isSeller ? "auto" : 0 }}>
          {comment.body}
        </div>
        <p style={{ fontSize: fontSize.xs, color: semantic.textMuted, marginTop: spacing[1] }}>{send_time}</p>
      </div>
      {isSeller && <Avatar src={comment.userIcon} name={comment.userName} size={32} />}
    </div>
  );
};

export default CommentItem;
