import React, { useState } from "react";
import { Heart } from "lucide-react";
import api from "../conf/api";
import { s } from "../styles/component/LikeButton.styles";

type Props = { itemId: number; initialLiked: boolean; size?: number; };

export const LikeButton: React.FC<Props> = ({ itemId, initialLiked, size = 24 }) => {
  const [liked, setLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      liked
        ? await api.post("/flea-market/item/unlike", { item_id: itemId })
        : await api.post("/flea-market/item/like", { item_id: itemId });
      setLiked(!liked);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <button onClick={toggle} style={{ ...s.btn, ...(liked ? s.btnLiked : {}) }} aria-label={liked ? "いいねを外す" : "いいね"}>
      <Heart size={size} style={liked ? s.iconLiked : s.iconUnliked} fill={liked ? "currentColor" : "none"} />
    </button>
  );
};
