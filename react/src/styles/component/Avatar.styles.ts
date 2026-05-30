import { colors, radius, fontSize, fontWeight } from "../tokens";

export const s = {
  avatarBase: {
    borderRadius: radius.full,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: fontWeight.bold,
    lineHeight: 1,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    borderRadius: radius.full,
  },
  avatarInitial: {
    borderRadius: radius.full,
    backgroundColor: colors.primary500,
    color: colors.neutral0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
};
