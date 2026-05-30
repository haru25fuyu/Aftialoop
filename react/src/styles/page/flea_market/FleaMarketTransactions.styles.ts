import { colors, semantic, spacing, fontSize } from "../../tokens";

export const s = {
page: { backgroundColor: semantic.bgSurfaceAlt, minHeight: "100vh" },
loadingWrap: { padding: spacing[6], fontSize: fontSize.sm, color: semantic.textSecondary },
errWrap: { padding: spacing[6] },
errText: { fontSize: fontSize.sm, color: colors.danger },
retryBtn: { marginTop: spacing[3], borderRadius: 12, border: `1px solid ${semantic.borderDefault}`, paddingLeft: spacing[4], paddingRight: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[2], fontSize: fontSize.sm, background: "none", cursor: "pointer" },
emptyWrap: { padding: spacing[6], fontSize: fontSize.sm, color: semantic.textSecondary },
requestWrap: { maxWidth: 600, margin: "0 auto", padding: spacing[4] },
txWrap: { maxWidth: 900, margin: "0 auto", padding: `${spacing[4]}px ${spacing[4]}px`, display: "flex", flexDirection: "column" as const, gap: spacing[4] },
};
