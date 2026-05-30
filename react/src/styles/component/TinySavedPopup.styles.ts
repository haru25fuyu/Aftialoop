import {
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadow,
} from "../tokens";

export const s = {
  popup: {
    position: "fixed" as const,
    bottom: `calc(64px + ${spacing[4]}px)`,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 300,
    display: "flex",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.primary700,
    color: colors.neutral0,
    padding: `${spacing[2]}px ${spacing[5]}px`,
    borderRadius: radius.full,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    ...shadow.lg,
    whiteSpace: "nowrap" as const,
    animation: "fadeInUp 0.2s ease, fadeOut 0.2s ease 2.8s forwards",
  },
};
