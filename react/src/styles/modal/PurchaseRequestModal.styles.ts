import { colors, radius, shadow } from "../../tokens";
import { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  overlay: { position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  card: { width: "100%", maxWidth: 640, backgroundColor: colors.surface, borderRadius: "16px 16px 0 0", boxShadow: shadow.xl, maxHeight: "90vh", display: "flex", flexDirection: "column" },
  header: { padding: "16px 20px", borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 },
  title: { fontSize: 18, fontWeight: 700, color: colors.text.primary },
  body: { padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 },
  section: { display: "flex", flexDirection: "column" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: colors.text.secondary },
  changeBtn: { fontSize: 13, color: "#1a5adc", background: "none", border: "none", cursor: "pointer", fontWeight: 700 },
  addAddressBtn: { padding: "12px 0", width: "100%", border: `2px dashed ${colors.border}`, borderRadius: radius.md, color: "#1a5adc", fontWeight: 700, background: "none", cursor: "pointer", fontSize: 14 },
  footer: { padding: "12px 20px", borderTop: `1px solid ${colors.border}`, display: "flex", gap: 12, flexShrink: 0 },
  cancelBtn: { flex: 1, padding: "12px 0", borderRadius: radius.md, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, fontWeight: 700, cursor: "pointer" },
  submitBtn: { flex: 2, padding: "12px 0", borderRadius: radius.md, backgroundColor: "#1a5adc", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" },
};
