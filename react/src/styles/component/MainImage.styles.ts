import { colors, semantic, radius } from "../tokens";

export const s = {
  wrap: {
    width: "100%",
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: colors.neutral100,
  },
  img: {
    width: "100%",
    height: "auto",
    objectFit: "cover" as const,
    display: "block",
  },
  placeholder: {
    width: "100%",
    aspectRatio: "16/9" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutral100,
    color: semantic.textMuted,
  },
};
