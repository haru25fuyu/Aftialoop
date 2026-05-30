import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../tokens";

export const s = {
page: { minHeight: "100vh", backgroundColor: semantic.bgPage },
wrap: { display: "flex", alignItems: "center", justifyContent: "center", padding: spacing[6] },
card: { width: "100%", maxWidth: 400, backgroundColor: semantic.bgSurface, borderRadius: radius.xl, padding: spacing[8], border: `1px solid ${semantic.borderDefault}` },
title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: semantic.textPrimary, textAlign: "center" as const, marginBottom: spacing[6] },
divider: { display: "flex", alignItems: "center", gap: spacing[3], marginTop: spacing[5], marginBottom: spacing[5], color: semantic.textMuted, fontSize: fontSize.sm },
divLine: { flex: 1, height: 1, backgroundColor: semantic.borderDefault },
formGroup: { marginBottom: spacing[4] },
label: { display: "block", fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: semantic.textPrimary, marginBottom: spacing[1] },
input: { width: "100%", height: 44, paddingLeft: spacing[4], paddingRight: spacing[4], border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.md, fontSize: fontSize.base, color: semantic.textPrimary, outline: "none", boxSizing: "border-box" as const },
errMsg: { fontSize: fontSize.xs, color: colors.danger, marginTop: spacing[1] },
errAlert: { padding: spacing[3], backgroundColor: colors.dangerBg, color: colors.danger, borderRadius: radius.md, fontSize: fontSize.sm, marginBottom: spacing[4] },
submitBtn: { width: "100%", height: 44, backgroundColor: colors.primary500, color: colors.neutral0, border: "none", borderRadius: radius.md, fontSize: fontSize.base, fontWeight: fontWeight.bold, cursor: "pointer" },
footer: { textAlign: "center" as const, marginTop: spacing[4], fontSize: fontSize.sm },
link: { color: semantic.textLink, textDecoration: "none" },
};
