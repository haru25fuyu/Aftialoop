import { colors, semantic } from "../tokens";
import { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: { fontSize: 20, fontWeight: 700, color: semantic.textPrimary },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 700,
    color: semantic.textSecondary,
    marginBottom: 6,
  },
  errMsg: { marginTop: 4, fontSize: 12, fontWeight: 700, color: colors.danger },
};
