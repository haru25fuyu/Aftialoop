import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
  children: React.ReactNode;
  height?: number;
  mobileOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export default function BottomBarPortal({
  children,
  height = 120,
  mobileOnly = true,
  className = "",
  style = {},
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null); // ← 無条件で先頭に置く

  useEffect(() => {
    if (typeof window === "undefined") return; // ← ここで環境分岐

    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;

    const apply = () => {
      const y = vv.offsetTop ?? 0;
      el.style.transform = `translateY(${y}px)`;
      const supportsEnv =
        (window as any).CSS?.supports?.("(bottom: env(safe-area-inset-bottom))") ?? false;
      el.style.setProperty("--safe-bottom", supportsEnv ? "env(safe-area-inset-bottom)" : "0px");
    };

    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
    };
  }, []);

  if (typeof document === "undefined") {
    // SSR時などは null を返す
    return null;
  }

  const node = (
    <div
      ref={ref}
      className={[
        "fixed inset-x-0 bottom-0 z-50",
        "will-change-transform [backface-visibility:hidden]",
        mobileOnly ? "md:hidden" : "",
        className,
      ].join(" ")}
      style={{
        height,
        paddingBottom: `calc(12px + var(--safe-bottom, 0px))`,
        ...style,
      }}
    >
      {children}
    </div>
  );

  return createPortal(node, document.body);
}
