import { colors, semantic, spacing, radius, shadow } from "../tokens";

export const s = {
btn: { backgroundColor: semantic.bgSurface, border: "none", borderRadius: radius.full, padding: spacing[2], cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", ...shadow.md, transition: "all 0.15s" },
btnLiked: { backgroundColor: colors.accent50 },
iconLiked: { color: colors.accent500 },
iconUnliked: { color: colors.neutral400 },
};
