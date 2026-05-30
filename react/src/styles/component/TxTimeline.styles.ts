import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../tokens";

export const s = {
wrap: { borderRadius: radius.xl, border: `1px solid ${semantic.borderDefault}`, backgroundColor: semantic.bgSurface, padding: spacing[6] },
track: { position: "relative" as const },
trackBg: { position: "absolute" as const, top: "50%", left: 0, right: 0, transform: "translateY(-50%)", padding: `0 ${spacing[2]}px`, height: 4, backgroundColor: colors.neutral100, borderRadius: radius.full },
trackProgress: (pct: number) => ({ height: 4, backgroundColor: colors.neutral900, borderRadius: radius.full, width: `${pct}%`, transition: "width 0.5s ease-in-out" }),
steps: { position: "relative" as const, display: "flex", justifyContent: "space-between", width: "100%" },
stepWrap: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: spacing[2] },
circle: (state: "completed" | "current" | "future") => ({ width: 40, height: 40, borderRadius: radius.full, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid`, zIndex: 1, transition: "all 0.3s", borderColor: state === "future" ? colors.neutral200 : colors.neutral900, backgroundColor: state === "completed" ? colors.neutral900 : colors.neutral0, color: state === "completed" ? colors.neutral0 : state === "future" ? colors.neutral300 : colors.neutral900, transform: state === "current" ? "scale(1.1)" : "scale(1)" }),
label: (active: boolean) => ({ fontSize: fontSize.xs, fontWeight: active ? fontWeight.bold : fontWeight.normal, color: active ? colors.neutral900 : colors.neutral400, position: "absolute" as const, bottom: -24, width: 80, textAlign: "center" as const }),
};
