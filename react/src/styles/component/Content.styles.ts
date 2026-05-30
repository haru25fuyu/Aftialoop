import { colors, semantic, spacing, radius, fontSize, fontWeight, shadow } from "../tokens";

export const s = {
basicCard: { display: "flex", flexDirection: "column" as const, alignItems: "center", textAlign: "left" as const, height: 280, overflow: "hidden", cursor: "pointer" },
basicImg: { width: "100%", maxWidth: 200, height: 100, objectFit: "contain" as const },
basicName: { textAlign: "center" as const, fontWeight: fontWeight.medium, color: semantic.textPrimary },
basicGrid: { width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing[2] },
basicLabel: { color: semantic.textSecondary },
cartCard: { width: "100%", position: "relative" as const, display: "flex", alignItems: "center", gap: spacing[6], padding: spacing[6], ...shadow.md, borderRadius: radius.xl, backgroundColor: semantic.bgSurface, cursor: "pointer" },
cartCheckbox: { position: "absolute" as const, top: spacing[5], left: spacing[2], width: 20, height: 20 },
cartImg: { flexShrink: 0, width: 160, height: 160, objectFit: "contain" as const },
cartInfo: { flex: 1, display: "flex", flexDirection: "column" as const, justifyContent: "space-between", gap: spacing[2], color: semantic.textPrimary },
cartName: { fontSize: fontSize.xl, fontWeight: fontWeight.medium },
cartPrice: { color: semantic.textSecondary },
cartQtyInput: { width: 64, marginLeft: spacing[2], padding: `${spacing[1]}px ${spacing[2]}px`, border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.sm, textAlign: "right" as const },
imageCard: { display: "flex", flexDirection: "column" as const, alignItems: "flex-start" },
imageImg: { width: 100, height: 100, objectFit: "cover" as const, marginBottom: spacing[4] },
};
