// components/TinySavedPopup.tsx
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Anchor = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export default function TinySavedPopup({
    open,
    onClose,
    message = "下書きを保存しました",
    duration = 1400,
    x = 50,     // 0=左端, 50=中央, 100=右端（vw基準）
    y = 80,     // 0=上端, 50=中央, 100=下端（vh基準）
    offsetX = 0, // px 微調整（+で右へ）
    offsetY = 0, // px 微調整（+で下へ）
    anchor = "center", // 位置の基準
}: {
    open: boolean;
    onClose?: () => void;
    message?: string;
    duration?: number;
    x?: number;
    y?: number;
    offsetX?: number;
    offsetY?: number;
    anchor?: Anchor;
}) {
    const [visible, setVisible] = useState(open);

    useEffect(() => {
        if (!open) return setVisible(false);
        setVisible(true);
        const t = setTimeout(() => {
            setVisible(false);
            onClose?.();
        }, duration);
        return () => clearTimeout(t);
    }, [open, duration, onClose]);

    // アンカーに応じて transform を決める
    const transform =
        anchor === "center" ? "translate(-50%, -50%)" :
            anchor === "top-left" ? "translate(0, 0)" :
                anchor === "top-right" ? "translate(-100%, 0)" :
                    anchor === "bottom-left" ? "translate(0, -100%)" :
    /* bottom-right */       "translate(-100%, -100%)";

    return createPortal(
        <div
            aria-live="polite"
            role="status"
            className="pointer-events-none fixed z-[10000]"
            style={{
                // セーフエリアも加味（左右/上下）
                left: `calc(${x}dvw + ${offsetX}px + ((${x} - 50)/50) * env(safe-area-inset-right))`,
                top: `calc(${y}dvh + ${offsetY}px + ((${y} - 50)/50) * env(safe-area-inset-bottom))`,
                transform,
            }}
        >
            <div
                className={[
                    "pointer-events-auto flex items-center gap-2 rounded-xl border bg-white px-3 py-2 shadow-xl",
                    "text-sm text-gray-800 dark:bg-neutral-900 dark:text-neutral-50 dark:border-neutral-800",
                    "transition-all duration-200",
                    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
                ].join(" ")}
            >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-white text-[10px]">✓</span>
                {message}
            </div>
        </div>,
        document.body
    );
}
