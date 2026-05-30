import { colors, radius, shadow } from "../../tokens";
import { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  overlay: { position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "rgba(0,0,0,0.5)" },
  card: { backgroundColor: colors.surface, width: "100%", maxWidth: 448, borderRadius: 20, boxShadow: shadow.xl, overflow: "hidden" },
  successBanner: { padding: "32px 24px 24px", textAlign: "center", borderBottom: `1px solid ${colors.border}` },
  body: { padding: 24 },
  primaryBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#1a1a1a", color: "#fff", fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
  secondaryBtn: { width: "100%", height: 48, borderRadius: 12, border: `2px solid ${colors.border}`, color: colors.text.secondary, fontWeight: 700, background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  linkBtn: { fontSize: 12, color: colors.text.secondary, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 4 },
};
