import { semantic, spacing, shadow } from "../tokens";

export const s = {
  bar: {
    position: "fixed" as const,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    backgroundColor: semantic.bgSurface,
    borderTop: `1px solid ${semantic.borderDefault}`,
    padding: `${spacing[3]}px ${spacing[4]}px`,
    paddingBottom: `calc(${spacing[3]}px + env(safe-area-inset-bottom))`,
    ...shadow.lg,
  },
};
