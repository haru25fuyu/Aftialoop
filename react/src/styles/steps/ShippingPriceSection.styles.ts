import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../tokens";

const inputBase = { width: "100%", backgroundColor: colors.neutral50, border: `1px solid ${colors.neutral300}`, color: semantic.textPrimary, fontSize: fontSize.sm, borderRadius: radius.lg, padding: spacing[3], outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" };

export const s = {
section: { backgroundColor: semantic.bgSurface, padding: spacing[5], borderRadius: radius.xl, border: `1px solid ${semantic.borderDefault}` },
title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing[6], paddingBottom: spacing[2], borderBottom: `1px solid ${colors.neutral100}` },
body: { display: "flex", flexDirection: "column" as const, gap: spacing[5] },
label: { display: "block", marginBottom: spacing[2], fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: semantic.textPrimary },
select: { ...inputBase },
feeTypeGrid: { display: "flex", flexDirection: "column" as const, gap: spacing[2] },
feeTypeBtn: (active: boolean) => ({ cursor: "pointer", border: `1px solid ${active ? colors.neutral900 : semantic.borderDefault}`, borderRadius: radius.lg, padding: spacing[3], backgroundColor: active ? colors.neutral100 : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }),
feeTypeBtnLeft: { display: "flex", alignItems: "center", gap: spacing[2] },
feeTypeName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
feeTypeDesc: { fontSize: fontSize.xs, color: semantic.textMuted },
priceSection: { backgroundColor: semantic.bgSurface, padding: spacing[5], borderRadius: radius.xl, border: `1px solid ${semantic.borderDefault}` },
priceRow: { display: "flex", alignItems: "center", gap: spacing[4] },
priceLabel: { fontWeight: fontWeight.bold, color: semantic.textPrimary, whiteSpace: "nowrap" as const },
priceInputWrap: { position: "relative" as const, width: "100%" },
pricePrefix: { position: "absolute" as const, insetBlock: 0, left: 0, display: "flex", alignItems: "center", paddingLeft: spacing[3], pointerEvents: "none" as const, color: semantic.textMuted, fontWeight: fontWeight.bold },
priceInput: { ...inputBase, paddingLeft: spacing[8], textAlign: "right" as const, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
errMsg: { fontSize: fontSize.xs, color: colors.danger, textAlign: "right" as const },
feeSummary: { display: "flex", flexDirection: "column" as const, gap: spacing[3], paddingTop: spacing[4], borderTop: `1px dashed ${semantic.borderDefault}` },
feeSummaryRow: { display: "flex", justifyContent: "space-between", fontSize: fontSize.sm },
feeSummaryLabel: { color: semantic.textSecondary },
feeSummaryValue: { color: semantic.textPrimary },
payoutRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: fontSize.lg, fontWeight: fontWeight.bold },
payoutLabel: { color: semantic.textPrimary },
payoutValue: { color: colors.info },
feeToggleBtn: { fontSize: fontSize.xs, color: semantic.textMuted, display: "flex", alignItems: "center", gap: spacing[1], width: "100%", justifyContent: "flex-end", background: "none", border: "none", cursor: "pointer" },
plusPctSection: { backgroundColor: semantic.bgSurface, padding: spacing[5], borderRadius: radius.xl, border: `1px solid ${semantic.borderDefault}` },
plusPctGrid: { display: "flex", flexWrap: "wrap" as const, gap: spacing[2] },
plusPctBtn: (active: boolean) => ({ border: `1px solid ${active ? colors.neutral900 : semantic.borderDefault}`, borderRadius: radius.full, padding: `${spacing[1]}px ${spacing[4]}px`, fontSize: fontSize.sm, fontWeight: fontWeight.bold, cursor: "pointer", backgroundColor: active ? colors.neutral900 : "transparent", color: active ? colors.neutral0 : semantic.textSecondary }),
};
