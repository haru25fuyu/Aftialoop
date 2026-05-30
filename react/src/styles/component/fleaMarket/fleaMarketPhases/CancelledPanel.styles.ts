import {
  colors,
  semantic,
  spacing,
  radius,
  fontSize,
  fontWeight,
} from "../../../../styles/tokens";

export const s = {
  wrap: { display: "flex", flexDirection: "column" as const, gap: spacing[4] },
  banner: {
    borderRadius: radius.xl,
    border: `1px solid ${colors.accent200}`,
    backgroundColor: colors.accent50,
    padding: spacing[5],
  },
  bannerInner: { display: "flex", alignItems: "flex-start", gap: spacing[3] },
  bannerTitle: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.lg,
    color: colors.accent500,
  },
  bannerDesc: {
    fontSize: fontSize.sm,
    color: colors.accent500,
    marginTop: spacing[1],
    opacity: 0.9,
  },
  section: {
    borderRadius: radius.xl,
    border: `1px solid ${semantic.borderDefault}`,
    backgroundColor: semantic.bgSurface,
    padding: spacing[4],
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: semantic.textSecondary,
    marginBottom: spacing[3],
  },
  reason: {
    fontSize: fontSize.sm,
    color: semantic.textSecondary,
    backgroundColor: semantic.bgSurfaceAlt,
    padding: spacing[3],
    borderRadius: radius.md,
  },
};
