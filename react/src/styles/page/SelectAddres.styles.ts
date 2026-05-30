import { colors, semantic, spacing, radius, fontSize, fontWeight, shadow } from "../tokens";

export const s = {
page: { backgroundColor: semantic.bgPage, minHeight: "100vh" },
header: { backgroundColor: semantic.bgSurface, padding: spacing[4], display: "flex", alignItems: "center", gap: spacing[4], borderBottom: `1px solid ${semantic.borderDefault}` },
title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: semantic.textPrimary },
list: { maxWidth: 640, margin: "0 auto", padding: spacing[4], display: "flex", flexDirection: "column" as const, gap: spacing[3] },
card: { borderRadius: radius.xl, border: `1px solid ${semantic.borderDefault}`, overflow: "hidden", ...shadow.sm },
label: { width: "100%", cursor: "pointer", display: "flex", flexDirection: "row" as const, alignItems: "center", gap: spacing[4], padding: `${spacing[2]}px ${spacing[3]}px`, transition: "background 0.1s" },
addressName: { fontWeight: fontWeight.medium },
addressText: { fontSize: fontSize.sm, color: semantic.textSecondary },
actionRow: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: spacing[2], marginTop: spacing[4], width: "100%", paddingBottom: spacing[2] },
useBtn: { width: "100%", maxWidth: 300, height: 44, backgroundColor: colors.primary500, color: colors.neutral0, border: "none", borderRadius: radius.md, fontWeight: fontWeight.bold, cursor: "pointer" },
footer: { maxWidth: 640, margin: "0 auto", padding: spacing[4] },
addBtn: { width: "100%", height: 44, backgroundColor: colors.neutral900, color: colors.neutral0, border: "none", borderRadius: radius.md, fontSize: fontSize.base, fontWeight: fontWeight.bold, cursor: "pointer" },
};
