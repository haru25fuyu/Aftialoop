import {
  colors,
  semantic,
  spacing,
  radius,
  fontSize,
  fontWeight,
} from "../tokens";

export const s = {
  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: spacing[4],
    padding: spacing[2],
  },
  item: { display: "flex", gap: spacing[3] },
  bubble: (isSeller: boolean) => ({
    flex: 1,
    padding: spacing[3],
    borderRadius: radius.lg,
    fontSize: fontSize.sm,
    lineHeight: 1.6,
    backgroundColor: isSeller ? colors.primary50 : semantic.bgSurface,
    border: `1px solid ${isSeller ? colors.primary200 : semantic.borderDefault}`,
    color: semantic.textPrimary,
  }),
  meta: {
    fontSize: fontSize.xs,
    color: semantic.textMuted,
    marginBottom: spacing[1],
  },
  sellerBadge: {
    display: "inline-flex",
    fontSize: 10,
    fontWeight: fontWeight.bold,
    backgroundColor: colors.primary100,
    color: colors.primary800,
    padding: `1px ${spacing[1]}px`,
    borderRadius: radius.sm,
    marginLeft: spacing[1],
  },
  emptyState: {
    padding: `${spacing[8]}px ${spacing[4]}px`,
    textAlign: "center" as const,
    color: semantic.textMuted,
    fontSize: fontSize.sm,
  },
};
