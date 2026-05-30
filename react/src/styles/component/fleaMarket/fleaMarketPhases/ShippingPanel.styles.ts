import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../../../../styles/tokens";

export const s = {
wrap: { display: "flex", flexDirection: "column" as const, gap: spacing[4] },
section: { backgroundColor: semantic.bgSurface, border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.xl, overflow: "hidden" },
sectionHeader: { backgroundColor: semantic.bgSurfaceAlt, borderBottom: `1px solid ${semantic.borderDefault}`, padding: `${spacing[3]}px ${spacing[4]}px` },
sectionTitle: { fontWeight: fontWeight.bold, color: semantic.textSecondary, fontSize: fontSize.sm, display: "flex", alignItems: "center", gap: spacing[2] },
sectionBody: { padding: spacing[4], display: "flex", flexDirection: "column" as const, gap: spacing[3] },
infoRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: fontSize.sm },
infoLabel: { color: semantic.textMuted },
infoValue: { fontWeight: fontWeight.medium, color: semantic.textPrimary },
totalRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: spacing[2], borderTop: `1px solid ${semantic.borderDefault}`, fontWeight: fontWeight.bold },
totalValue: { color: colors.primary600, fontSize: fontSize.lg },
select: { width: "100%", height: 44, paddingLeft: spacing[3], paddingRight: spacing[3], border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.md, fontSize: fontSize.sm, color: semantic.textPrimary, backgroundColor: semantic.bgSurface, outline: "none" },
input: { width: "100%", height: 44, paddingLeft: spacing[3], paddingRight: spacing[3], border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.md, fontSize: fontSize.sm, color: semantic.textPrimary, backgroundColor: semantic.bgSurface, outline: "none" },
shipBtn: { width: "100%", borderRadius: radius.xl, padding: `${spacing[3]}px 0`, fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.neutral0, border: "none", cursor: "pointer", backgroundColor: colors.primary500 },
completeBtn: { width: "100%", borderRadius: radius.xl, padding: `${spacing[3]}px 0`, fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.neutral0, border: "none", cursor: "pointer", backgroundColor: colors.accent500 },
trackingBadge: { display: "inline-flex", alignItems: "center", gap: spacing[1], backgroundColor: colors.primary100, color: colors.primary800, fontSize: fontSize.xs, fontWeight: fontWeight.medium, padding: `2px ${spacing[2]}px`, borderRadius: radius.sm },
cancelArea: { marginTop: spacing[8], paddingTop: spacing[6], borderTop: `1px dashed ${semantic.borderDefault}` },
};
