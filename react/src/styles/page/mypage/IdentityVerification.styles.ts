import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../../tokens";

export const s = {
page: { backgroundColor: semantic.bgPage, minHeight: "100vh" },
body: { maxWidth: 512, margin: "0 auto", padding: spacing[5] },
statusBanner: (status: string) => ({ padding: spacing[5], borderRadius: radius.xl, border: `1px solid`, marginBottom: spacing[5], backgroundColor: status === "APPROVED" ? colors.successBg : status === "REJECTED" ? colors.dangerBg : colors.warningBg, borderColor: status === "APPROVED" ? colors.success : status === "REJECTED" ? colors.danger : colors.warning }),
statusTitle: { fontWeight: fontWeight.bold, fontSize: fontSize.lg },
formCard: { backgroundColor: semantic.bgSurface, borderRadius: radius.xl, padding: spacing[6], border: `1px solid ${semantic.borderDefault}`, display: "flex", flexDirection: "column" as const, gap: spacing[4] },
formGroup: { display: "flex", flexDirection: "column" as const, gap: spacing[1] },
label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: semantic.textPrimary },
input: { width: "100%", height: 44, paddingLeft: spacing[4], paddingRight: spacing[4], border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.md, fontSize: fontSize.base, color: semantic.textPrimary, backgroundColor: semantic.bgSurface, outline: "none", boxSizing: "border-box" as const },
imgUpload: { border: `2px dashed ${semantic.borderDefault}`, borderRadius: radius.lg, padding: spacing[6], textAlign: "center" as const, cursor: "pointer", backgroundColor: semantic.bgSurfaceAlt },
imgPreview: { width: "100%", borderRadius: radius.md, objectFit: "cover" as const },
submitBtn: { width: "100%", height: 48, backgroundColor: colors.primary500, color: colors.neutral0, border: "none", borderRadius: radius.lg, fontSize: fontSize.base, fontWeight: fontWeight.bold, cursor: "pointer" },
};
