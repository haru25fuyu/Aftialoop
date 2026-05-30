import { colors, semantic, spacing, radius, fontSize, fontWeight, shadow } from "../../tokens";

export const s = {
page: { backgroundColor: semantic.bgPage, minHeight: "100vh", paddingBottom: 80 },
header: { backgroundColor: semantic.bgSurface, padding: spacing[4], display: "flex", alignItems: "center", gap: spacing[4], borderBottom: `1px solid ${semantic.borderDefault}`, position: "sticky" as const, top: 0, zIndex: 10 },
title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: semantic.textPrimary },
balanceCard: { maxWidth: 512, margin: `${spacing[4]}px auto`, padding: `0 ${spacing[4]}px` },
balanceInner: { backgroundColor: semantic.bgSurface, borderRadius: radius.xl, padding: spacing[5], border: `1px solid ${semantic.borderDefault}`, ...shadow.sm },
balanceLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: semantic.textMuted, marginBottom: spacing[1] },
balanceValue: { fontSize: fontSize["2xl"], fontWeight: fontWeight.bold, color: semantic.textPrimary },
withdrawBtn: { marginTop: spacing[4], width: "100%", height: 44, backgroundColor: colors.primary500, color: colors.neutral0, border: "none", borderRadius: radius.md, fontSize: fontSize.base, fontWeight: fontWeight.bold, cursor: "pointer" },
list: { maxWidth: 512, margin: "0 auto", padding: `0 ${spacing[4]}px` },
item: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: spacing[4], backgroundColor: semantic.bgSurface, borderRadius: radius.lg, border: `1px solid ${semantic.borderDefault}`, marginBottom: spacing[3], ...shadow.sm },
itemInfo: { display: "flex", alignItems: "flex-start", gap: spacing[3] },
itemIcon: (positive: boolean) => ({ color: positive ? colors.primary500 : semantic.textMuted }),
itemLabel: { fontWeight: fontWeight.bold, color: semantic.textPrimary, fontSize: fontSize.sm },
itemDate: { fontSize: fontSize.xs, color: semantic.textMuted, marginTop: 2 },
itemAmount: (positive: boolean) => ({ fontWeight: fontWeight.bold, fontSize: fontSize.lg, color: positive ? colors.primary600 : semantic.textSecondary }),
};
