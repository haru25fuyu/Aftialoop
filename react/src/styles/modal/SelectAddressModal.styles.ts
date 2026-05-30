import { semantic, radius } from "../tokens";
import { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    width: "100%",
    maxWidth: 640,
    backgroundColor: semantic.bgSurface,
    borderRadius: radius.lg,
    boxShadow: "0 8px 24px rgba(26,26,26,0.14)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: `1px solid ${semantic.borderDefault}`,
  },
  title: { fontSize: 18, fontWeight: 700, color: semantic.textPrimary },
  body: { padding: 24, maxHeight: "80vh", overflowY: "auto" },
  selectBtn: {
    width: "100%",
    marginTop: 12,
    padding: "8px 0",
    backgroundColor: "#1a5adc",
    color: "#fff",
    border: "none",
    borderRadius: radius.sm,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
  },
};
