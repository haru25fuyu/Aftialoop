import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../../tokens";

export const s = {
header: { position: "sticky" as const, top: 0, zIndex: 40, backgroundColor: semantic.bgSurface, borderBottom: `1px solid ${semantic.borderDefault}` },
inner: { maxWidth: 572, margin: "0 auto", padding: `0 ${spacing[4]}px`, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" },
title: { fontWeight: fontWeight.bold, fontSize: fontSize.base, color: semantic.textPrimary },
btnRow: { display: "flex", gap: spacing[2], alignItems: "center" },
draftBtn: { padding: `${spacing[1]}px ${spacing[3]}px`, backgroundColor: "transparent", border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.md, fontSize: fontSize.sm, color: semantic.textSecondary, cursor: "pointer" },
resetBtn: { padding: `${spacing[1]}px ${spacing[3]}px`, backgroundColor: "transparent", border: "none", fontSize: fontSize.sm, color: semantic.textMuted, cursor: "pointer" },
savingText: { fontSize: fontSize.xs, color: semantic.textMuted },
savedText: { fontSize: fontSize.xs, color: colors.success },
};
