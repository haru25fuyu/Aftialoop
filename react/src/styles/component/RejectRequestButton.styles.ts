import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../tokens";

export const s = {
btn: { display: "inline-flex", alignItems: "center", gap: spacing[2], padding: `${spacing[2]}px ${spacing[4]}px`, borderRadius: radius.lg, border: `1px solid ${colors.accent200}`, backgroundColor: colors.accent50, color: colors.accent500, fontSize: fontSize.sm, fontWeight: fontWeight.bold, cursor: "pointer" },
overlay: { position: "fixed" as const, inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: spacing[4], backgroundColor: "rgba(0,0,0,0.5)" },
modal: { backgroundColor: semantic.bgSurface, borderRadius: radius.xl, width: "100%", maxWidth: 448, overflow: "hidden" },
modalHeader: { padding: `${spacing[4]}px ${spacing[6]}px`, borderBottom: `1px solid ${semantic.borderDefault}`, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: semantic.bgSurfaceAlt },
modalTitle: { fontWeight: fontWeight.bold, color: semantic.textPrimary, display: "flex", alignItems: "center", gap: spacing[2] },
modalBody: { padding: spacing[6], display: "flex", flexDirection: "column" as const, gap: spacing[4] },
alert: { backgroundColor: colors.dangerBg, padding: spacing[3], borderRadius: radius.md, fontSize: fontSize.sm, color: colors.danger },
label: { display: "block", fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: semantic.textPrimary, marginBottom: spacing[2] },
textarea: { width: "100%", border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.lg, padding: spacing[3], fontSize: fontSize.sm, outline: "none", fontFamily: "inherit", resize: "none" as const },
modalFooter: { padding: `${spacing[4]}px ${spacing[6]}px`, backgroundColor: semantic.bgSurfaceAlt, display: "flex", justifyContent: "flex-end", gap: spacing[3] },
cancelBtn: { padding: `${spacing[2]}px ${spacing[4]}px`, color: semantic.textSecondary, backgroundColor: "transparent", border: "none", borderRadius: radius.lg, fontWeight: fontWeight.bold, cursor: "pointer", fontSize: fontSize.sm },
confirmBtn: (disabled: boolean) => ({ display: "flex", alignItems: "center", gap: spacing[2], padding: `${spacing[2]}px ${spacing[6]}px`, borderRadius: radius.lg, fontWeight: fontWeight.bold, color: colors.neutral0, fontSize: fontSize.sm, border: "none", cursor: disabled ? "not-allowed" : "pointer", backgroundColor: disabled ? colors.neutral300 : colors.danger }),
};
