import { colors, radius, shadow } from "../../tokens";
import { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  overlay: { position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 16 },
  card: { display: "flex", maxHeight: "90vh", width: "100%", maxWidth: 448, flexDirection: "column", overflow: "hidden", borderRadius: radius.lg, backgroundColor: colors.surface, boxShadow: shadow.xl },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${colors.border}`, padding: "12px 16px" },
  breadcrumb: { borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.muted, padding: "8px 16px", fontSize: 14, color: colors.text.secondary, overflowX: "auto", whiteSpace: "nowrap" },
  list: { flex: 1, overflowY: "auto", padding: 8 },
};
