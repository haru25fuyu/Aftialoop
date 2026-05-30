import React, { useEffect } from "react";
import { X, ShoppingCart } from "lucide-react";
import { s } from "../styles/snackBar/AddCart.styles";

type Props = {
  visible: boolean;
  onClose: () => void;
  onViewCart: () => void;
  item?: { name?: string; main_image_url?: string } | null;
};

export function CartAddBar({ visible, onClose, onViewCart, item }: Props) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => onClose(), 3500);
    return () => clearTimeout(t);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div style={s.bar}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
        <div style={s.iconWrap}>
          <ShoppingCart size={18} style={{ color: "#3a7a22" }} />
        </div>
        <div>
          <p style={s.mainText}>カートに追加しました</p>
          {item?.name && <p style={s.subText}>{item.name}</p>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onViewCart} style={s.viewCartBtn}>
          カートを見る
        </button>
        <button onClick={onClose} style={s.closeBtn}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
