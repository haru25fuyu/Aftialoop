import {
  colors,
  semantic,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadow,
} from "../tokens";

export const s = {
  main: {
    maxWidth: 640,
    margin: "0 auto",
    padding: `${spacing[10]}px ${spacing[4]}px`,
    textAlign: "center" as const,
  },
  card: {
    backgroundColor: semantic.bgSurface,
    padding: spacing[8],
    borderRadius: radius.xl,
    border: `1px solid ${semantic.borderDefault}`,
    ...shadow.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    backgroundColor: colors.successBg,
    color: colors.success,
    borderRadius: radius.full,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto",
    fontSize: 28,
    fontWeight: fontWeight.bold,
    marginBottom: spacing[5],
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: semantic.textPrimary,
    marginBottom: spacing[4],
  },
  desc: {
    color: semantic.textSecondary,
    lineHeight: 1.8,
    marginBottom: spacing[2],
  },
  btn: {
    display: "inline-block",
    backgroundColor: colors.primary500,
    color: colors.neutral0,
    fontWeight: fontWeight.bold,
    padding: `${spacing[3]}px ${spacing[8]}px`,
    borderRadius: radius.xl,
    textDecoration: "none",
  },
};
