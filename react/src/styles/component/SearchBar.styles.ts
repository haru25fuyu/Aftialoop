import { colors, semantic, spacing, radius, fontSize } from "../tokens";

export const s = {
wrap: { position: "relative" as const },
form: { display: "flex", alignItems: "center", width: "100%", height: 40, borderRadius: radius.full, backgroundColor: colors.neutral100, border: `1px solid ${semantic.borderDefault}`, overflow: "hidden" },
icon: { paddingLeft: spacing[3], color: semantic.textMuted, flexShrink: 0 },
input: { flex: 1, backgroundColor: "transparent", paddingLeft: spacing[3], paddingRight: spacing[3], border: "none", outline: "none", fontSize: fontSize.sm, color: semantic.textPrimary },
clearBtn: { paddingRight: spacing[3], color: semantic.textMuted, background: "none", border: "none", cursor: "pointer" },
dropdown: { position: "absolute" as const, top: "100%", left: 0, right: 0, backgroundColor: semantic.bgSurface, border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.lg, marginTop: spacing[1], zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden" },
dropdownItem: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: `${spacing[3]}px ${spacing[4]}px`, background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, fontSize: fontSize.sm, color: semantic.textPrimary },
dropdownFooter: { borderTop: `1px solid ${semantic.borderDefault}`, padding: `${spacing[3]}px ${spacing[4]}px`, fontSize: fontSize.sm, color: colors.info, fontWeight: "500" as const, display: "flex", alignItems: "center", gap: spacing[2], background: "none", border: "none", cursor: "pointer", width: "100%" },
tagCategory: { fontSize: 10, padding: `1px ${spacing[2]}px`, borderRadius: radius.sm, backgroundColor: colors.successBg, color: colors.success },
tagSupply: { fontSize: 10, padding: `1px ${spacing[2]}px`, borderRadius: radius.sm, backgroundColor: colors.warningBg, color: colors.warning },
};
