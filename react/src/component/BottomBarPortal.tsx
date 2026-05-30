import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { s } from '../styles/component/BottomBarPortal.styles';

type Props = {
  children: React.ReactNode;
  height?: number;
  mobileOnly?: boolean;
  style?: React.CSSProperties;
};

export default function BottomBarPortal({ children, height = 120, mobileOnly = true, style = {} }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;
    const apply = () => {
      const y = vv.offsetTop ?? 0;
      el.style.transform = `translateY(${y}px)`;
      const supportsEnv = (window as any).CSS?.supports?.("(bottom: env(safe-area-inset-bottom))") ?? false;
      el.style.setProperty("--safe-bottom", supportsEnv ? "env(safe-area-inset-bottom)" : "0px");
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => { vv.removeEventListener("resize", apply); vv.removeEventListener("scroll", apply); };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div ref={ref} style={{ ...s.bar, height, display: mobileOnly ? undefined : "flex", ...style }}>
      {children}
    </div>,
    document.body
  );
}
