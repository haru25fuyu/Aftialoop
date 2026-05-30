import { colors, semantic, spacing, radius, fontSize, fontWeight, shadow } from "../../tokens";

export const s = {
page: { backgroundColor: semantic.bgSurfaceAlt, minHeight: "100vh", paddingBottom: 80 },
header: { backgroundColor: semantic.bgSurface, padding: spacing[4], display: "flex", alignItems: "center", gap: spacing[4], borderBottom: `1px solid ${semantic.borderDefault}`, position: "sticky" as const, top: 0, zIndex: 10 },
title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: semantic.textPrimary },
hint: { fontSize: fontSize.xs, color: semantic.textMuted, maxWidth: 480, margin: `0 auto`, padding: `${spacing[2]}px ${spacing[4]}px` },
list: { maxWidth: 480, margin: "0 auto", padding: spacing[4], display: "flex", flexDirection: "column" as const, gap: spacing[3] },
item: { display: "block", backgroundColor: semantic.bgSurface, padding: spacing[4], borderRadius: radius.xl, border: `1px solid ${semantic.borderDefault}`, textDecoration: "none", ...shadow.sm },
itemInner: { display: "flex", gap: spacing[4] },
img: { width: 80, height: 80, borderRadius: radius.lg, flexShrink: 0, overflow: "hidden", border: `1px solid ${semantic.borderDefault}`, backgroundColor: colors.neutral100 },
info: { flex: 1, minWidth: 0 },
itemName: { fontWeight: fontWeight.bold, fontSize: fontSize.sm, color: semantic.textPrimary, marginBottom: spacing[1] },
buyerName: { fontSize: fontSize.xs, color: semantic.textMuted, marginBottom: spacing[1] },
date: { fontSize: fontSize.xs, color: semantic.textMuted },
statusBadge: { display: "inline-flex", fontSize: fontSize.xs, fontWeight: fontWeight.bold, padding: `2px ${spacing[2]}px`, borderRadius: radius.full, backgroundColor: colors.warningBg, color: colors.warning, marginTop: spacing[2] },
};
