import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../../tokens";

export const s = {
page: { minHeight: "100vh", backgroundColor: semantic.bgPage },
body: { maxWidth: 640, margin: "0 auto", padding: spacing[6] },
avatarSection: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: spacing[3], marginBottom: spacing[6] },
avatarWrap: { position: "relative" as const, cursor: "pointer" },
avatar: { width: 96, height: 96, borderRadius: radius.full, objectFit: "cover" as const, border: `3px solid ${semantic.borderDefault}` },
avatarOverlay: { position: "absolute" as const, inset: 0, borderRadius: radius.full, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" },
avatarHint: { fontSize: fontSize.xs, color: semantic.textMuted },
section: { backgroundColor: semantic.bgSurface, borderRadius: radius.xl, padding: spacing[6], marginBottom: spacing[4] },
sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: semantic.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: spacing[4] },
formGroup: { marginBottom: spacing[4] },
label: { display: "block", fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: semantic.textPrimary, marginBottom: `${spacing[1]}px 0 ${spacing[1]}px ${spacing[1]}px` },
input: { width: "100%", paddingLeft: spacing[4], paddingRight: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[3], borderRadius: radius.xl, border: `1px solid ${colors.neutral200}`, backgroundColor: colors.neutral50, fontSize: fontSize.base, color: semantic.textPrimary, outline: "none", boxSizing: "border-box" as const },
textarea: { width: "100%", padding: spacing[4], borderRadius: radius.xl, border: `1px solid ${colors.neutral200}`, backgroundColor: colors.neutral50, fontSize: fontSize.base, color: semantic.textPrimary, outline: "none", resize: "vertical" as const, fontFamily: "inherit", boxSizing: "border-box" as const, minHeight: 100 },
privateRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: spacing[4], borderRadius: radius.xl, border: `1px solid ${colors.neutral100}`, backgroundColor: colors.neutral50 },
changeLink: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.success, textDecoration: "none" },
submitBtn: { width: "100%", padding: `${spacing[4]}px 0`, borderRadius: radius.xl, fontWeight: fontWeight.bold, color: colors.neutral0, backgroundColor: colors.success, border: "none", cursor: "pointer", fontSize: fontSize.base, ...{boxShadow: `0 4px 12px rgba(58,122,34,0.3)`} },
};
