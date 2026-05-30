import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../tokens";

export const s = {
container: { position: "fixed" as const, bottom: `calc(64px + ${spacing[4]}px)`, left: "50%", transform: "translateX(-50%)", zIndex: 300, display: "flex", flexDirection: "column" as const, gap: spacing[2], alignItems: "center" },
toast: { display: "flex", alignItems: "center", gap: spacing[3], padding: `${spacing[3]}px ${spacing[5]}px`, backgroundColor: colors.neutral900, color: colors.neutral50, borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", whiteSpace: "nowrap" as const },
toastSuccess: { backgroundColor: colors.primary700 },
toastError: { backgroundColor: colors.accent600 },
toastWarning: { backgroundColor: colors.warning, color: colors.neutral900 },
};
