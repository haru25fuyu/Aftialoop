import { colors, spacing, fontSize } from "../tokens";

export const s = {
  footer: {
    backgroundColor: colors.neutral900,
    color: colors.neutral0,
    padding: `${spacing[8]}px 0 0`,
  },
  categoryList: {
    display: "flex",
    listStyle: "none",
    justifyContent: "center",
    gap: spacing[10],
    padding: `${spacing[3]}px 0`,
  },
  categoryItem: {
    color: colors.neutral400,
    fontSize: fontSize.sm,
    cursor: "pointer",
  },
  menuContent: {
    display: "flex",
    maxWidth: 1200,
    margin: "0 auto",
    padding: `${spacing[5]}px ${spacing[4]}px`,
  },
  footerLogo: { height: 40, width: "auto" },
  menu: { display: "flex", gap: spacing[10], marginLeft: spacing[10] },
  menuList: { listStyle: "none", padding: 0 },
  menuItem: {
    color: colors.neutral300,
    fontSize: fontSize.sm,
    marginBottom: spacing[2],
    cursor: "pointer",
  },
  menuItemGray: {
    color: colors.neutral600,
    fontSize: fontSize.sm,
    marginBottom: spacing[2],
    cursor: "pointer",
  },
  copyright: {
    backgroundColor: colors.neutral900,
    borderTop: `1px solid ${colors.neutral800}`,
    padding: `${spacing[2]}px 0`,
    textAlign: "center" as const,
  },
  copyrightText: { color: colors.neutral600, fontSize: fontSize.xs, margin: 0 },
};
