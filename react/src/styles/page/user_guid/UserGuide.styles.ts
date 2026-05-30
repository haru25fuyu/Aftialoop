import { CSSProperties } from "react";

export const s: {
  layout: CSSProperties;
  sidebar: CSSProperties;
  sidebarLink: (active: boolean) => CSSProperties;
  content: CSSProperties;
  h1: CSSProperties;
} = {
  layout: {
    display: "flex",
    width: "100%",
    minHeight: "100vh",
    backgroundColor: "#fff",
  },
  sidebar: {
    width: 256,
    backgroundColor: "#f8f7f5",
    borderRight: "1px solid #e0ddd8",
    paddingTop: 32,
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  sidebarLink: (active: boolean): CSSProperties => ({
    display: "block",
    padding: "12px 24px",
    fontSize: 14,
    textDecoration: "none",
    color: active ? "#fff" : "#5c5a56",
    backgroundColor: active ? "#1a5adc" : "transparent",
    fontWeight: active ? 700 : 400,
    transition: "background-color 0.15s",
  }),
  content: {
    flex: 1,
    padding: "48px",
    overflowY: "auto",
  },
  h1: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 32,
    paddingBottom: 16,
    borderBottom: "1px solid #e0ddd8",
    color: "#1a1a1a",
  },
};
