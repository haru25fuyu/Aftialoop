import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../../../../styles/tokens";

export const s = {
wrap: { display: "flex", flexDirection: "column" as const, gap: spacing[4] },
banner: { borderRadius: radius.xl, border: `1px solid ${colors.neutral300}`, backgroundColor: colors.neutral100, padding: spacing[5] },
bannerInner: { display: "flex", alignItems: "flex-start", gap: spacing[3] },
bannerTitle: { fontWeight: fontWeight.bold, fontSize: fontSize.lg, color: semantic.textPrimary },
bannerDesc: { fontSize: fontSize.sm, color: semantic.textSecondary, marginTop: spacing[1] },
reason: { fontSize: fontSize.sm, color: semantic.textSecondary, backgroundColor: semantic.bgSurfaceAlt, padding: spacing[3], borderRadius: radius.md },
};
