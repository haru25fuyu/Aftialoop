import {
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
    maxWidth: 720,
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
    marginBottom: spacing[6],
  },
};
