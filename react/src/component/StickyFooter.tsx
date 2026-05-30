import React from "react";
import { colors, semantic, spacing, radius, fontSize } from "../styles/tokens";

export function StickyFooter({ canPublish, loading, onDraft, onPublish }: { canPublish: boolean; loading?: boolean; onDraft: () => void; onPublish: () => void; }) {
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, borderTop: `1px solid ${semantic.borderDefault}`, backgroundColor: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: spacing[3], padding: `${spacing[3]}px ${spacing[4]}px` }}>
        <button onClick={onDraft} style={{ borderRadius: radius.sm, border: `1px solid ${semantic.borderDefault}`, padding: `${spacing[2]}px ${spacing[4]}px`, fontSize: fontSize.sm, background: "none", cursor: "pointer", color: semantic.textPrimary }}>下書き保存</button>
        <button disabled={!canPublish || loading} onClick={onPublish}
          style={{ borderRadius: radius.sm, padding: `${spacing[2]}px ${spacing[4]}px`, fontSize: fontSize.sm, color: colors.neutral0, backgroundColor: canPublish && !loading ? colors.neutral900 : colors.neutral400, cursor: canPublish && !loading ? "pointer" : "not-allowed", border: "none" }}>
          {loading ? "公開中…" : "今すぐ公開"}
        </button>
      </div>
    </div>
  );
}
