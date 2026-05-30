import { colors, semantic, spacing, radius, fontSize, fontWeight, shadow } from "../../../../styles/tokens";

export const s = {
wrap: { display: "flex", flexDirection: "column" as const, gap: spacing[4] },
itemCard: { display: "flex", gap: spacing[4], padding: spacing[4], border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.xl, backgroundColor: semantic.bgSurfaceAlt },
itemImg: { width: 64, height: 64, flexShrink: 0, overflow: "hidden", borderRadius: radius.lg, backgroundColor: colors.neutral200, border: `1px solid ${semantic.borderDefault}` },
itemInfo: { flex: 1, minWidth: 0 },
itemName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: semantic.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
itemPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary700, marginTop: spacing[1] },
section: { backgroundColor: semantic.bgSurface, border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.xl, padding: spacing[4], ...shadow.sm },
sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: semantic.textSecondary, marginBottom: spacing[3], display: "flex", alignItems: "center", gap: spacing[2] },
radioGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing[2] },
radioBtn: (checked: boolean, disabled?: boolean) => ({ borderRadius: radius.xl, border: `1px solid ${checked ? colors.neutral900 : semantic.borderDefault}`, padding: spacing[3], textAlign: "left" as const, backgroundColor: checked ? colors.neutral100 : "transparent", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, transition: "all 0.1s" }),
radioBtnTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
radioBtnDesc: { fontSize: fontSize.xs, color: semantic.textMuted, marginTop: 2 },
select: { width: "100%", height: 44, paddingLeft: spacing[3], border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.md, fontSize: fontSize.sm, color: semantic.textPrimary, backgroundColor: semantic.bgSurface, outline: "none" },
estimateBox: { backgroundColor: colors.primary50, border: `1px solid ${colors.primary200}`, borderRadius: radius.md, padding: spacing[3], display: "flex", justifyContent: "space-between", alignItems: "center" },
estimateLabel: { fontSize: fontSize.sm, color: colors.primary700 },
estimateValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary700 },
addressBox: { backgroundColor: semantic.bgSurfaceAlt, borderRadius: radius.md, padding: spacing[3], fontSize: fontSize.sm, color: semantic.textSecondary },
acceptBtn: { width: "100%", borderRadius: radius.xl, padding: `${spacing[3]}px 0`, fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.neutral0, border: "none", cursor: "pointer", backgroundColor: colors.neutral900 },
};
