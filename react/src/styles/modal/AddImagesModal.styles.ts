import { semantic, radius } from "../tokens";
import { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: semantic.bgSurface,
    width: "92%",
    maxWidth: 720,
    borderRadius: 16,
    boxShadow: "0 8px 24px rgba(26,26,26,0.14)",
  },
  header: {
    padding: "16px 20px",
    borderBottom: `1px solid ${semantic.borderDefault}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  body: { padding: 20 },
  footer: {
    padding: "12px 20px",
    borderTop: `1px solid ${semantic.borderDefault}`,
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelBtn: {
    padding: "10px 24px",
    borderRadius: radius.md,
    border: `1px solid ${semantic.borderDefault}`,
    backgroundColor: semantic.bgSurface,
    fontWeight: 700,
    cursor: "pointer",
  },
  saveBtn: {
    padding: "10px 24px",
    borderRadius: radius.md,
    backgroundColor: "#1a5adc",
    color: "#fff",
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
  },
};
