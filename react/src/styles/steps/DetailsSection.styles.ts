import {
  colors,
  semantic,
  spacing,
  radius,
  fontSize,
  fontWeight,
} from "../tokens";

const inputBase = {
  width: "100%",
  backgroundColor: colors.neutral50,
  border: `1px solid ${colors.neutral300}`,
  color: semantic.textPrimary,
  fontSize: fontSize.sm,
  borderRadius: radius.lg,
  padding: spacing[3],
  outline: "none",
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
};

export const s = {
  section: {
    backgroundColor: semantic.bgSurface,
    padding: spacing[5],
    borderRadius: radius.xl,
    border: `1px solid ${semantic.borderDefault}`,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing[6],
    paddingBottom: spacing[2],
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  body: { display: "flex", flexDirection: "column" as const, gap: spacing[6] },
  label: {
    display: "block",
    marginBottom: spacing[2],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: semantic.textPrimary,
  },
  input: { ...inputBase },
  select: { ...inputBase },
  sexGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: spacing[2],
  },
  sexBtn: (active: boolean) => ({
    cursor: "pointer",
    border: `1px solid ${active ? colors.neutral900 : semantic.borderDefault}`,
    borderRadius: radius.lg,
    padding: spacing[3],
    textAlign: "center" as const,
    backgroundColor: active ? colors.neutral100 : "transparent",
    fontWeight: active ? fontWeight.bold : fontWeight.normal,
    fontSize: fontSize.sm,
  }),
  sizeRow: { display: "flex", gap: spacing[2] },
  sizeInput: { ...inputBase, flex: 1 },
  sizeUnitSelect: { ...inputBase, width: 80 },
  supplyGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: spacing[4],
  },
};
