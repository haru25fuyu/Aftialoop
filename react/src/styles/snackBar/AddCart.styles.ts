import { colors, semantic, spacing, radius, fontSize, fontWeight, shadow } from "../tokens";

export const s = {
bar: { position: "fixed" as const, bottom: `calc(64px + ${spacing[4]}px)`, left: "50%", transform: "translateX(-50%)", zIndex: 200, backgroundColor: semantic.bgSurface, border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.xl, padding: `${spacing[3]}px ${spacing[5]}px`, display: "flex", alignItems: "center", gap: spacing[4], ...shadow.lg, whiteSpace: "nowrap" as const },
img: { width: 40, height: 40, borderRadius: radius.md, objectFit: "cover" as const, backgroundColor: colors.primary50 },
text: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: semantic.textPrimary },
viewBtn: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary600, background: "none", border: "none", cursor: "pointer" },
closeBtn: { fontSize: fontSize.sm, color: semantic.textMuted, background: "none", border: "none", cursor: "pointer" },
};
