import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../../tokens";

export const s = {
page: { minHeight: "100vh", backgroundColor: semantic.bgSurfaceAlt, paddingBottom: 128 },
stickyHeader: { position: "sticky" as const, top: 0, zIndex: 40, backgroundColor: semantic.bgSurface, borderBottom: `1px solid ${semantic.borderDefault}` },
progressTrack: { display: "flex", width: "100%", height: 4 },
progressHalf: (active: boolean) => ({ flex: 1, height: "100%", backgroundColor: active ? colors.info : colors.neutral200, transition: "background-color 0.3s" }),
progressFull: { width: "100%", height: 4, backgroundColor: colors.success },
main: { maxWidth: 572, margin: "0 auto", paddingTop: spacing[6], paddingLeft: spacing[4], paddingRight: spacing[4], display: "flex", flexDirection: "column" as const, gap: spacing[6] },
publicSection: { backgroundColor: semantic.bgSurface, padding: `${spacing[5]}px ${spacing[6]}px`, borderRadius: radius.xl, border: `1px solid ${semantic.borderDefault}` },
publicTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing[4], paddingBottom: spacing[2], borderBottom: `1px solid ${colors.neutral100}` },
statusRow: { display: "flex", gap: spacing[2] },
statusBtn: (active: boolean) => ({ cursor: "pointer", border: `1px solid ${active ? colors.info : semantic.borderDefault}`, borderRadius: radius.lg, paddingLeft: spacing[4], paddingRight: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[2], fontSize: fontSize.sm, fontWeight: fontWeight.bold, backgroundColor: active ? colors.infoBg : "transparent", color: active ? colors.info : semantic.textSecondary }),
footer: { position: "fixed" as const, bottom: 0, left: 0, right: 0, backgroundColor: semantic.bgSurface, borderTop: `1px solid ${semantic.borderDefault}`, padding: `${spacing[3]}px ${spacing[4]}px`, paddingBottom: `calc(${spacing[3]}px + env(safe-area-inset-bottom))` },
footerInner: { maxWidth: 572, margin: "0 auto", display: "flex", gap: spacing[3] },
prevBtn: { flex: 1, height: 48, backgroundColor: colors.neutral100, color: semantic.textPrimary, border: "none", borderRadius: radius.lg, fontWeight: fontWeight.bold, cursor: "pointer" },
nextBtn: { flex: 2, height: 48, backgroundColor: colors.neutral900, color: colors.neutral0, border: "none", borderRadius: radius.lg, fontWeight: fontWeight.bold, cursor: "pointer" },
publishBtn: (disabled: boolean) => ({ flex: 2, height: 48, backgroundColor: disabled ? colors.neutral300 : colors.accent500, color: colors.neutral0, border: "none", borderRadius: radius.lg, fontWeight: fontWeight.bold, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.7 : 1 }),
};
