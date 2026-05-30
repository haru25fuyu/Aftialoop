import { colors, semantic, spacing, radius, fontSize, fontWeight, shadow } from "../../tokens";

export const s = {
page: { paddingBottom: 128, backgroundColor: semantic.bgPage },
imgWrap: { width: "100%", backgroundColor: colors.primary50 },
img: { width: "100%", objectFit: "cover" as const },
infoWrap: { padding: spacing[4] },
title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: semantic.textPrimary, marginBottom: spacing[2] },
price: { fontSize: fontSize["2xl"], fontWeight: fontWeight.bold, color: colors.primary700, marginBottom: spacing[4] },
descCard: { border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.xl, padding: spacing[4], backgroundColor: semantic.bgSurface, ...shadow.sm },
descTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, marginBottom: spacing[2], color: semantic.textPrimary },
desc: { color: semantic.textSecondary, lineHeight: 1.7 },
bottomBar: { display: "flex", flexDirection: "column" as const, gap: spacing[3], padding: spacing[4] },
qtyRow: { display: "flex", alignItems: "center", gap: spacing[3] },
qtyBtn: { width: 40, height: 40, borderRadius: radius.xl, backgroundColor: colors.neutral100, border: "none", fontSize: fontSize.lg, cursor: "pointer", color: semantic.textPrimary },
qtyValue: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: semantic.textPrimary },
btnRow: { display: "flex", gap: spacing[2] },
cartBtn: { flex: 1, borderRadius: radius.xl, backgroundColor: colors.primary500, color: colors.neutral0, border: "none", padding: spacing[3], cursor: "pointer", fontWeight: fontWeight.medium, fontSize: fontSize.base },
buyBtn: { flex: 1, borderRadius: radius.xl, backgroundColor: colors.accent500, color: colors.neutral0, border: "none", padding: spacing[3], cursor: "pointer", fontWeight: fontWeight.medium, fontSize: fontSize.base },
};
