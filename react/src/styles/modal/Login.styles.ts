import { colors, radius, shadow, spacing, typography } from "../../tokens";
import { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  overlay: { position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  closeBtn: { position: "absolute", top: 16, right: 16, color: "#fff", fontSize: 28, background: "none", border: "none", cursor: "pointer" },
  card: { width: "100%", maxWidth: 448, padding: 20, backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: shadow.xl, position: "relative" },
  title: { fontSize: 22, fontWeight: 700, textAlign: "center", color: colors.text.primary, marginBottom: 20 },
  divider: { display: "flex", alignItems: "center", gap: 12, margin: "16px 0" },
  divText: { color: colors.text.secondary, fontSize: 14 },
  errAlert: { backgroundColor: "#fef0ec", color: colors.danger, padding: "10px 12px", borderRadius: radius.sm, fontSize: 14, marginBottom: 12 },
  formGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 14, fontWeight: 500, color: colors.text.secondary, marginBottom: 4 },
  input: { width: "100%", padding: "8px 12px", border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: 14, boxSizing: "border-box" as const, outline: "none" },
  submitBtn: { width: "100%", padding: "10px 0", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: radius.sm, fontWeight: 500, fontSize: 14, cursor: "pointer", marginTop: 8 },
  link: { color: "#4f46e5", textDecoration: "none", fontSize: 14 },
  sep: { color: colors.text.muted, margin: "0 8px" },
  footer: { display: "flex", justifyContent: "center", alignItems: "center", marginTop: 12 },
};
