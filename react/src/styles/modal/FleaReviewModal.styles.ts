import { semantic } from "../tokens";
import { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(2px)",
  },
  card: {
    backgroundColor: semantic.bgSurface,
    width: "100%",
    maxWidth: 448,
    borderRadius: 16,
    boxShadow: "0 8px 24px rgba(26,26,26,0.14)",
    overflow: "hidden",
  },
  header: {
    backgroundColor: semantic.bgSurfaceAlt,
    padding: "16px 24px",
    borderBottom: `1px solid ${semantic.borderDefault}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  body: { padding: 24, display: "flex", flexDirection: "column", gap: 16 },
};
