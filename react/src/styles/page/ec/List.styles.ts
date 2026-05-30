import { colors, semantic, spacing, radius, fontSize, fontWeight, shadow } from "../../tokens";

export const s = {
main: { width: "100%" },
grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: spacing[4], width: "90%", margin: "0 auto", padding: `${spacing[4]}px 0` },
card: { display: "flex", flexDirection: "column" as const, border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.md, backgroundColor: semantic.bgSurface, padding: spacing[4], ...shadow.sm },
cardImg: { width: "100%", height: "auto", objectFit: "cover" as const, borderRadius: radius.sm },
cardBody: { display: "flex", flexDirection: "column" as const, justifyContent: "space-between", flex: 1, marginTop: spacing[3], fontSize: fontSize.sm },
cardName: { fontWeight: fontWeight.medium, color: semantic.textPrimary, fontSize: fontSize.sm, marginBottom: spacing[1], overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const },
rating: { color: colors.primary400, fontSize: fontSize.xs, marginTop: spacing[1] },
ratingCount: { color: semantic.textMuted },
price: { color: colors.primary700, fontWeight: fontWeight.bold, fontSize: fontSize.lg, marginTop: spacing[1] },
point: { fontSize: fontSize.xs, color: colors.accent500, marginTop: spacing[1] },
pointRate: { color: colors.accent500 },
shipping: { fontSize: fontSize.xs, color: semantic.textMuted },
addCartBtn: { backgroundColor: colors.primary500, color: colors.neutral0, border: "none", borderRadius: radius.md, fontSize: fontSize.sm, fontWeight: fontWeight.bold, padding: `${spacing[2]}px 0`, width: "100%", marginTop: spacing[3], cursor: "pointer" },
};
