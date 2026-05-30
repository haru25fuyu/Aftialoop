import React from "react";
import { Customer } from "../types/Content";
import { colors, semantic, spacing, fontSize } from "../styles/tokens";

interface Props { price: number; user?: Customer | null; num: number; showShipping?: boolean; }

export const PriceWithPerks: React.FC<Props> = ({ price, user, num, showShipping = true }) => {
  let discount = 0;
  if (user && user.point > 0) { const usable = Math.min(user.point, price); discount = Math.floor(usable * num); }
  const hasDiscount = discount > 0;
  const finalPrice = price - discount;
  const bigDiscount = discount >= 100;

  return (
    <div>
      <p style={{ color: semantic.textPrimary, fontWeight: "700", marginTop: spacing[1], fontSize: fontSize.sm }}>{(hasDiscount ? finalPrice : price).toLocaleString()}円</p>
      {hasDiscount ? (
        <>
          <p style={{ color: semantic.textMuted, textDecoration: "line-through", fontSize: fontSize.xs }}>{price.toLocaleString()}円</p>
          <p style={{ marginTop: 2 }}><span style={{ display: "inline-block", padding: "1px 6px", borderRadius: 9999, backgroundColor: colors.infoBg, color: colors.info, fontSize: 10, fontWeight: "600" }}>サブスク優待</span></p>
          <p style={{ color: bigDiscount ? colors.success : semantic.textMuted, fontSize: 11, marginTop: 2 }}>ポイント利用で{discount.toLocaleString()}円おトク</p>
        </>
      ) : (
        <p style={{ color: semantic.textMuted, fontSize: 11, marginTop: 2 }}>サブスクポイント利用でおトクに</p>
      )}
      {showShipping && <p style={{ color: semantic.textMuted, fontWeight: "500", marginTop: 2, fontSize: 11 }}>送料込み</p>}
    </div>
  );
};
