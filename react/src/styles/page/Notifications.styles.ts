import { colors, semantic, spacing, radius, fontSize, fontWeight, shadow } from "../tokens";

export const s = {
page: { backgroundColor: semantic.bgPage, minHeight: "100vh", paddingBottom: 80 },
header: { backgroundColor: semantic.bgSurface, padding: spacing[4], display: "flex", alignItems: "center", gap: spacing[4], borderBottom: `1px solid ${semantic.borderDefault}`, position: "sticky" as const, top: 0, zIndex: 10 },
title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: semantic.textPrimary },
list: { maxWidth: 512, margin: "0 auto", padding: `0 ${spacing[4]}px` },
item: (unread: boolean) => ({ display: "flex", gap: spacing[3], padding: spacing[4], borderBottom: `1px solid ${semantic.borderDefault}`, backgroundColor: unread ? colors.primary50 : semantic.bgSurface, cursor: "pointer" }),
iconWrap: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary100, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: colors.primary600 },
body: { flex: 1, minWidth: 0 },
bodyTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: semantic.textPrimary, marginBottom: 2 },
bodyDate: { fontSize: fontSize.xs, color: semantic.textMuted },
unreadDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.accent500, flexShrink: 0, marginTop: 4 },
};
