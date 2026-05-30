import { colors, radius, shadow, spacing } from "../../tokens";
import { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50, padding: 16 },
  card: { width: "100%", maxWidth: 448, backgroundColor: colors.surface, borderRadius: 16, boxShadow: shadow.xl, overflow: "hidden", maxHeight: "90vh", position: "relative", display: "flex", flexDirection: "column" },
  closeBtn: { position: "absolute", top: 16, right: 16, padding: 8, backgroundColor: colors.muted, borderRadius: "50%", border: "none", cursor: "pointer", color: colors.text.secondary, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  body: { padding: "24px 32px", overflowY: "auto", flex: 1 },
  title: { fontSize: 20, fontWeight: 700, color: colors.text.primary, marginBottom: 24 },
};
