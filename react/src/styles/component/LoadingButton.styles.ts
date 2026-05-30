import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../tokens";

export const s = {
btn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: spacing[2], height: 44, paddingLeft: spacing[6], paddingRight: spacing[6], borderRadius: radius.md, fontSize: fontSize.base, fontWeight: fontWeight.medium, cursor: "pointer", border: "none", transition: "all 0.1s", fontFamily: "inherit" },
btnDisabled: { opacity: 0.45, cursor: "not-allowed" },
spinner: { width: 16, height: 16, borderRadius: "50%", borderWidth: 2, borderStyle: "solid", borderColor: "rgba(255,255,255,0.3)", borderTopColor: colors.neutral0, animation: "spin 0.7s linear infinite", flexShrink: 0 },
};
