import React from "react";
import { semantic, spacing, radius, fontSize } from "../../../styles/tokens";

export default function UnknownPanel({ data }: { data: any }) {
  return (
    <div style={{ borderRadius: radius.xl, border: `1px solid ${semantic.borderDefault}`, backgroundColor: semantic.bgSurface, padding: spacing[4], fontSize: fontSize.sm, color: semantic.textMuted }}>
      フェーズ不明：サポートまでお問い合わせください。
    </div>
  );
}
