import { colors, radius, shadow } from "../../tokens";
import { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  overlay: { position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surface, width: "92%", maxWidth: 720, borderRadius: 16, boxShadow: shadow.xl },
  header: { padding: "16px 20px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" },
  body: { padding: 20 },
  footer: { padding: "12px 20px", borderTop: `1px solid ${colors.border}`, display: "flex", justifyContent: "flex-end", gap: 12 },
  cancelBtn: { padding: "10px 24px", borderRadius: radius.md, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, fontWeight: 700, cursor: "pointer" },
  saveBtn: { padding: "10px 24px", borderRadius: radius.md, backgroundColor: "#1a5adc", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" },
};
