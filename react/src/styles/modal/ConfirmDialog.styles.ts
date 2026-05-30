import { colors, radius, shadow } from "../../tokens";
import { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  overlay: { position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" },
  card: { backgroundColor: colors.surface, width: "100%", maxWidth: 672, borderRadius: 16, boxShadow: shadow.xl, display: "flex", flexDirection: "column", maxHeight: "90vh" },
  header: { padding: "16px 24px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  body: { padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: colors.text.secondary, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 12 },
  footer: { padding: "16px 24px", borderTop: `1px solid ${colors.border}`, display: "flex", gap: 12, justifyContent: "flex-end", flexShrink: 0 },
  cancelBtn: { padding: "10px 24px", borderRadius: radius.md, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, fontWeight: 700, cursor: "pointer", fontSize: 14 },
  confirmBtn: { padding: "10px 24px", borderRadius: radius.md, backgroundColor: "#1a5adc", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 14 },
};
