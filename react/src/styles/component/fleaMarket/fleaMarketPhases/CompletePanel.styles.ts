import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../../../../styles/tokens";

export const s = {
wrap: { display: "flex", flexDirection: "column" as const, gap: spacing[4] },
banner: { borderRadius: radius.xl, border: `1px solid ${colors.successBg}`, backgroundColor: colors.successBg, padding: spacing[5] },
bannerInner: { display: "flex", alignItems: "flex-start", gap: spacing[3] },
bannerTitle: { fontWeight: fontWeight.bold, fontSize: fontSize.lg, color: colors.success },
bannerDesc: { fontSize: fontSize.sm, color: colors.success, marginTop: spacing[1], opacity: 0.9 },
section: { borderRadius: radius.xl, border: `1px solid ${semantic.borderDefault}`, backgroundColor: semantic.bgSurface, padding: spacing[4] },
sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: semantic.textSecondary, marginBottom: spacing[3] },
row: { display: "flex", justifyContent: "space-between", fontSize: fontSize.sm, padding: `${spacing[1]}px 0` },
rowLabel: { color: semantic.textMuted },
rowValue: { fontWeight: fontWeight.medium, color: semantic.textPrimary },
};
