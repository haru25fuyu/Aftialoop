import { semantic, radius } from "../tokens";
import { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 16,
  },
  card: {
    display: "flex",
    maxHeight: "90vh",
    width: "100%",
    maxWidth: 448,
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: semantic.bgSurface,
    boxShadow: "0 8px 24px rgba(26,26,26,0.14)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: `1px solid ${semantic.borderDefault}`,
    padding: "12px 16px",
  },
  breadcrumb: {
    borderBottom: `1px solid ${semantic.borderDefault}`,
    backgroundColor: semantic.bgSurfaceAlt,
    padding: "8px 16px",
    fontSize: 14,
    color: semantic.textSecondary,
    overflowX: "auto",
    whiteSpace: "nowrap",
  },
  list: { flex: 1, overflowY: "auto", padding: 8 },
};
