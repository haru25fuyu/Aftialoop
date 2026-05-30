import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../../tokens";

export const s = {
page: { textAlign: "center" as const, padding: `${spacing[10]}px ${spacing[5]}px` },
icon: { width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.successBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.success, margin: `0 auto ${spacing[4]}px` },
title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: semantic.textPrimary, marginBottom: spacing[2] },
desc: { fontSize: fontSize.sm, color: semantic.textSecondary, marginBottom: spacing[6] },
btn: { marginTop: spacing[6], display: "inline-block", textDecoration: "none", color: colors.neutral0, backgroundColor: colors.primary500, padding: `${spacing[3]}px ${spacing[8]}px`, borderRadius: radius.md, fontWeight: fontWeight.bold },
};
