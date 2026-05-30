import { spacing } from "../../../tokens";

export const s = {
  wrap: {
    display: "flex",
    flexDirection: "column" as const,
    gap: spacing[4],
    padding: `0 ${spacing[4]}px`,
  },
};
