import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../../tokens";

export const s = {
page: { backgroundColor: semantic.bgPage, minHeight: "100vh", paddingBottom: 80 },
header: { backgroundColor: semantic.bgSurface, padding: spacing[4], display: "flex", alignItems: "center", gap: spacing[4], borderBottom: `1px solid ${semantic.borderDefault}`, position: "sticky" as const, top: 0, zIndex: 10 },
title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: semantic.textPrimary },
list: { maxWidth: 512, margin: "0 auto", padding: spacing[4] },
item: { display: "flex", alignItems: "center", gap: spacing[4], padding: spacing[4], backgroundColor: semantic.bgSurface, borderRadius: radius.xl, border: `1px solid ${semantic.borderDefault}`, marginBottom: spacing[3] },
avatar: { width: 48, height: 48, borderRadius: radius.full, objectFit: "cover" as const, flexShrink: 0 },
info: { flex: 1, minWidth: 0 },
name: { fontWeight: fontWeight.medium, fontSize: fontSize.base, color: semantic.textPrimary },
unblockBtn: { padding: `${spacing[1]}px ${spacing[3]}px`, fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.danger, backgroundColor: colors.dangerBg, border: `1px solid ${colors.accent200}`, borderRadius: radius.md, cursor: "pointer" },
};
