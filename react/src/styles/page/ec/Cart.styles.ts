import { colors, semantic, spacing, radius, fontSize, fontWeight, shadow } from "../../tokens";

export const s = {
page: { backgroundColor: semantic.bgPage, minHeight: "100vh", paddingBottom: 220 },
title: { fontSize: fontSize["2xl"], fontWeight: fontWeight.bold, color: semantic.textPrimary, textAlign: "center" as const, padding: `${spacing[4]}px ${spacing[4]}px` },
list: { maxWidth: 720, margin: "0 auto", padding: `0 ${spacing[4]}px`, display: "flex", flexDirection: "column" as const, gap: spacing[3] },
item: { display: "flex", gap: spacing[4], backgroundColor: semantic.bgSurface, borderRadius: radius.lg, border: `1px solid ${semantic.borderDefault}`, padding: spacing[4], ...shadow.sm },
itemImg: { width: 80, height: 80, borderRadius: radius.md, objectFit: "cover" as const, flexShrink: 0, backgroundColor: colors.primary50 },
itemInfo: { flex: 1, minWidth: 0 },
itemName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: semantic.textPrimary, marginBottom: spacing[2], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
itemPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary700 },
checkboxWrap: { position: "absolute" as const, top: spacing[5], left: spacing[2] },
qtyInput: { width: 64, marginLeft: spacing[2], padding: `${spacing[1]}px ${spacing[2]}px`, border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.sm, textAlign: "right" as const },
footer: { position: "fixed" as const, bottom: 0, left: 0, right: 0, backgroundColor: semantic.bgSurface, borderTop: `1px solid ${semantic.borderDefault}`, padding: `${spacing[4]}px ${spacing[6]}px`, boxShadow: "0 -4px 12px rgba(0,0,0,0.08)" },
footerText: { textAlign: "center" as const, fontSize: fontSize.md, fontWeight: fontWeight.medium, color: semantic.textPrimary, marginBottom: spacing[1] },
footerSub: { textAlign: "center" as const, fontSize: fontSize.sm, color: semantic.textMuted, marginBottom: spacing[3] },
checkoutBtn: { width: "100%", height: 48, backgroundColor: colors.accent500, color: colors.neutral0, border: "none", borderRadius: radius.lg, fontSize: fontSize.md, fontWeight: fontWeight.bold, cursor: "pointer" },
};
