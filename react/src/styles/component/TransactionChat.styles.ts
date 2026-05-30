import { colors, semantic, spacing, radius, fontSize, fontWeight } from "../tokens";

export const s = {
container: { display: "flex", flexDirection: "column" as const, height: "100%" },
messageList: { flex: 1, overflowY: "auto" as const, padding: spacing[4], display: "flex", flexDirection: "column" as const, gap: spacing[3] },
messageRow: (isMe: boolean) => ({ display: "flex", flexDirection: (isMe ? "row-reverse" : "row") as "row" | "row-reverse", gap: spacing[2], alignItems: "flex-start" as const }),
bubbleWrap: (isMe: boolean) => ({ maxWidth: "70%", display: "flex", flexDirection: "column" as const, alignItems: (isMe ? "flex-end" : "flex-start") as "flex-end" | "flex-start", gap: spacing[1] }),
timestamp: { fontSize: fontSize.xs, color: semantic.textMuted, marginBottom: spacing[1] },
bubble: (isMe: boolean) => ({ padding: spacing[3], borderRadius: radius.lg, fontSize: fontSize.sm, whiteSpace: "pre-wrap" as const, lineHeight: 1.6, backgroundColor: isMe ? colors.primary600 : semantic.bgSurface, color: isMe ? colors.neutral0 : semantic.textPrimary, border: isMe ? "none" : `1px solid ${semantic.borderDefault}`, borderTopRightRadius: isMe ? 4 : radius.lg, borderTopLeftRadius: isMe ? radius.lg : 4 }),
inputArea: { padding: spacing[4], backgroundColor: semantic.bgSurface, borderTop: `1px solid ${semantic.borderDefault}` },
inputRow: { display: "flex", gap: spacing[2] },
textarea: { flex: 1, padding: spacing[3], border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.lg, outline: "none", resize: "none" as const, fontSize: fontSize.sm, color: semantic.textPrimary, backgroundColor: semantic.bgSurface, fontFamily: "inherit" },
sendBtn: (disabled: boolean) => ({ padding: `0 ${spacing[4]}px`, borderRadius: radius.lg, fontWeight: fontWeight.bold, color: colors.neutral0, border: "none", cursor: disabled ? "not-allowed" : "pointer", backgroundColor: disabled ? colors.neutral300 : colors.primary500 }),
};
