import { colors } from "../tokens";

export const spinnerSize = { sm: { width: 16, height: 16, borderWidth: 2 }, md: { width: 32, height: 32, borderWidth: 3 }, lg: { width: 48, height: 48, borderWidth: 4 } };
export const s = {
wrap: { display: "flex", justifyContent: "center", alignItems: "center" },
spinner: (size: "sm" | "md" | "lg") => ({ ...spinnerSize[size], borderRadius: "50%", borderStyle: "solid", borderColor: colors.neutral200, borderTopColor: colors.primary500, animation: "spin 0.7s linear infinite" }),
};
