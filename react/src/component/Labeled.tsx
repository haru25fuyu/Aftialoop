import React from "react";
import { semantic, spacing, fontSize } from "../styles/tokens";
import { colors } from "../styles/tokens";

export function Labeled({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: spacing[1], display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label style={{ fontSize: fontSize.sm, color: semantic.textPrimary }}>{label}</label>
        {error && <span style={{ fontSize: fontSize.xs, color: colors.danger }}>{error}</span>}
      </div>
      {children}
    </div>
  );
}
