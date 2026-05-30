import { colors, semantic, spacing, radius, fontSize, fontWeight, shadow } from "../tokens";

export const s = {
page: { backgroundColor: semantic.bgPage, minHeight: "100vh" },
header: { backgroundColor: semantic.bgSurface, padding: spacing[4], display: "flex", alignItems: "center", gap: spacing[4], borderBottom: `1px solid ${semantic.borderDefault}` },
title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: semantic.textPrimary },
list: { maxWidth: 640, margin: "0 auto", padding: spacing[4], display: "flex", flexDirection: "column" as const, gap: spacing[3] },
card: (selected: boolean) => ({ position: "relative" as const, borderRadius: radius.lg, border: `1px solid ${selected ? colors.primary500 : semantic.borderDefault}`, overflow: "hidden", ...shadow.sm }),
cardBody: { padding: spacing[4], cursor: "pointer" },
cardBrand: { fontWeight: fontWeight.bold, fontSize: fontSize.base, color: semantic.textSecondary, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: spacing[2] },
cardNumber: { fontSize: fontSize.xl, fontFamily: "monospace", color: semantic.textPrimary, letterSpacing: "0.15em", marginBottom: spacing[2] },
cardExpiry: { fontSize: fontSize.sm, color: semantic.textMuted },
useBtn: { width: "100%", height: 44, backgroundColor: colors.primary500, color: colors.neutral0, border: "none", borderRadius: radius.md, fontWeight: fontWeight.bold, cursor: "pointer", marginTop: spacing[4] },
};
