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
  page: { minHeight: "100vh", backgroundColor: semantic.bgPage },
  main: {
    maxWidth: 640,
    margin: "0 auto",
    padding: `${spacing[8]}px ${spacing[4]}px`,
  },
  card: {
    backgroundColor: semantic.bgSurface,
    borderRadius: radius.xl,
    padding: spacing[8],
    border: `1px solid ${semantic.borderDefault}`,
    ...shadow.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: semantic.textPrimary,
    marginBottom: spacing[4],
  },
  link: {
    display: "inline-block",
    padding: `${spacing[3]}px ${spacing[6]}px`,
    backgroundColor: colors.primary500,
    color: colors.neutral0,
    borderRadius: radius.md,
    fontWeight: fontWeight.bold,
    textDecoration: "none",
  },
};
