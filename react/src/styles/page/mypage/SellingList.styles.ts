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
    backgroundColor: semantic.bgSurfaceAlt,
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
  },
  title: {
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.bold,
    color: semantic.textPrimary,
  },
  list: {
    maxWidth: 640,
    margin: "0 auto",
    padding: spacing[4],
    display: "flex",
    flexDirection: "column" as const,
    gap: spacing[3],
  },
  item: {
    display: "flex",
    gap: spacing[4],
    backgroundColor: semantic.bgSurface,
    borderRadius: radius.xl,
    border: `1px solid ${semantic.borderDefault}`,
    padding: spacing[4],
    textDecoration: "none",
    ...shadow.sm,
  },
  img: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    objectFit: "cover" as const,
    flexShrink: 0,
    backgroundColor: colors.primary50,
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
    color: semantic.textPrimary,
    marginBottom: spacing[2],
  },
  price: { fontWeight: fontWeight.bold, color: colors.primary700 },
  statusBadge: (status: number) => ({
    display: "inline-flex",
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    padding: `2px ${spacing[2]}px`,
    borderRadius: radius.full,
    backgroundColor:
      status === 1
        ? colors.infoBg
        : status === 2
          ? colors.warningBg
          : status === 3
            ? colors.neutral100
            : colors.dangerBg,
    color:
      status === 1
        ? colors.info
        : status === 2
          ? colors.warning
          : status === 3
            ? colors.neutral600
            : colors.danger,
  }),
};
