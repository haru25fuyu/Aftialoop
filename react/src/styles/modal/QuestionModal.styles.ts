import { semantic } from "../tokens";
import { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 70,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  card: {
    width: "100%",
    maxWidth: 720,
    backgroundColor: semantic.bgSurface,
    borderRadius: "16px 16px 0 0",
    boxShadow: "0 8px 24px rgba(26,26,26,0.14)",
    height: "90vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "12px 16px",
    borderBottom: `1px solid ${semantic.borderDefault}`,
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    backgroundColor: semantic.bgSurfaceAlt,
    padding: "0 8px",
  },
  inputArea: {
    padding: 12,
    borderTop: `1px solid ${semantic.borderDefault}`,
    display: "flex",
    gap: 8,
    flexShrink: 0,
  },
};
