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
    border: `1px solid ${colors.primary200}`,
    backgroundColor: colors.warningBg,
    padding: spacing[5],
    color: colors.warning,
  },
  bannerInner: { display: "flex", alignItems: "flex-start", gap: spacing[3] },
  bannerTitle: { fontWeight: fontWeight.bold, fontSize: fontSize.lg },
  bannerDesc: { fontSize: fontSize.sm, marginTop: spacing[1], opacity: 0.9 },
  section: {
    borderRadius: radius.xl,
    border: `1px solid ${semantic.borderDefault}`,
    backgroundColor: semantic.bgSurface,
    overflow: "hidden",
  },
  sectionHeader: {
    backgroundColor: semantic.bgSurfaceAlt,
    borderBottom: `1px solid ${semantic.borderDefault}`,
    padding: `${spacing[3]}px ${spacing[4]}px`,
  },
  sectionTitle: {
    fontWeight: fontWeight.bold,
    color: semantic.textSecondary,
    fontSize: fontSize.sm,
    display: "flex",
    alignItems: "center",
    gap: spacing[2],
  },
  sectionBody: {
    padding: spacing[4],
    display: "flex",
    flexDirection: "column" as const,
    gap: spacing[3],
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: fontSize.sm,
  },
  rowLabel: { color: semantic.textMuted },
  rowValue: { fontWeight: fontWeight.medium, color: semantic.textPrimary },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingTop: spacing[2],
    borderTop: `1px solid ${semantic.borderDefault}`,
    fontWeight: fontWeight.bold,
  },
  totalValue: { color: colors.primary600, fontSize: fontSize.lg },
  cancelArea: {
    marginTop: spacing[8],
    paddingTop: spacing[6],
    borderTop: `1px dashed ${semantic.borderDefault}`,
  },
};
