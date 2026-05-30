import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = { open: boolean; onClose?: () => void; message?: string; duration?: number; x?: number; y?: number; offsetX?: number; offsetY?: number; anchor?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right"; };

export default function TinySavedPopup({ open, onClose, message = "下書きを保存しました", duration = 1400, x = 50, y = 80, offsetX = 0, offsetY = 0, anchor = "center" }: Props) {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (!open) return setVisible(false);
    setVisible(true);
    const t = setTimeout(() => { setVisible(false); onClose?.(); }, duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  const transform = anchor === "center" ? "translate(-50%, -50%)" : anchor === "top-left" ? "translate(0, 0)" : anchor === "top-right" ? "translate(-100%, 0)" : anchor === "bottom-left" ? "translate(0, -100%)" : "translate(-100%, -100%)";

  return createPortal(
    <div aria-live="polite" role="status" style={{ pointerEvents: "none", position: "fixed", zIndex: 10000, left: `calc(${x}dvw + ${offsetX}px)`, top: `calc(${y}dvh + ${offsetY}px)`, transform }}>
      <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 8, borderRadius: 12, border: "1px solid #e0ddd8", backgroundColor: "#fff", padding: "8px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.14)", fontSize: 14, color: "#2e3128", transition: "all 0.2s", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)" }}>
        <span style={{ display: "inline-flex", width: 16, height: 16, alignItems: "center", justifyContent: "center", borderRadius: "50%", backgroundColor: "#3a7a22", color: "#fff", fontSize: 10 }}>✓</span>
        {message}
      </div>
    </div>,
    document.body
  );
}
