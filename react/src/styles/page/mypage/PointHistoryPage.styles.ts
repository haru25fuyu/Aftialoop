import {
  colors,
  semantic,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadow,
} from "../../tokens";

export const s = {
  page: {
    backgroundColor: semantic.bgPage,
    minHeight: "100vh",
    paddingBottom: 80,
  },
  header: {
    backgroundColor: semantic.bgSurface,
    padding: spacing[4],
    display: "flex",
    alignItems: "center",
    gap: spacing[4],
    borderBottom: `1px solid ${semantic.borderDefault}`,
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: semantic.textPrimary,
  },
  balanceCard: {
    maxWidth: 512,
    margin: `${spacing[4]}px auto 0`,
    padding: `0 ${spacing[4]}px`,
  },
  balanceInner: {
    backgroundColor: semantic.bgSurface,
    borderRadius: radius.xl,
    padding: spacing[5],
    border: `1px solid ${semantic.borderDefault}`,
    ...shadow.sm,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: semantic.textMuted,
  },
  balanceValue: {
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.bold,
    color: colors.primary600,
  },
  list: { maxWidth: 512, margin: "0 auto", padding: spacing[4] },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[4],
    borderBottom: `1px solid ${semantic.borderDefault}`,
  },
  itemLeft: { display: "flex", alignItems: "flex-start", gap: spacing[3] },
  itemIcon: (positive: boolean) => ({
    color: positive ? colors.primary500 : semantic.textMuted,
    marginTop: 2,
  }),
  itemLabel: {
    fontWeight: fontWeight.bold,
    color: semantic.textPrimary,
    fontSize: fontSize.sm,
  },
  itemDate: { fontSize: fontSize.xs, color: semantic.textMuted, marginTop: 2 },
  itemRight: { textAlign: "right" as const },
  itemAmount: (positive: boolean) => ({
    fontWeight: fontWeight.bold,
    fontSize: fontSize.lg,
    color: positive ? colors.primary600 : semantic.textSecondary,
  }),
  itemBalance: {
    fontSize: fontSize.xs,
    color: semantic.textMuted,
    marginTop: 2,
  },
};
