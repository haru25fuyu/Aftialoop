import React, { useState, useRef, useEffect } from "react";
import { PREFS } from "../conf/config";
import { Labeled } from "./Labeled";
import { semantic, spacing, radius, fontSize } from "../styles/tokens";
import { colors } from "../styles/tokens";

export default function ShipFromSelect({ value, onChange, error }: { value: number | null; onChange: (val: number | null) => void; error?: string; }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = PREFS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const selectedName = value != null ? (PREFS.find((p) => p.id === value)?.name ?? "") : "";
  const inputStyle = { width: "100%", height: 44, paddingLeft: spacing[4], paddingRight: spacing[4], border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.md, fontSize: fontSize.sm, color: semantic.textPrimary, outline: "none", boxSizing: "border-box" as const };
  const dropdownStyle = { position: "absolute" as const, top: "100%", left: 0, right: 0, backgroundColor: semantic.bgSurface, border: `1px solid ${semantic.borderDefault}`, borderRadius: radius.lg, marginTop: spacing[1], zIndex: 50, maxHeight: 192, overflowY: "auto" as const, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" };
  const itemStyle = (active: boolean) => ({ cursor: "pointer", padding: `${spacing[2]}px ${spacing[3]}px`, fontSize: fontSize.sm, color: semantic.textPrimary, backgroundColor: active ? colors.neutral50 : "transparent", fontWeight: active ? "600" as const : "400" as const });

  return (
    <Labeled label="発送元" error={error}>
      <div ref={ref} style={{ position: "relative" }}>
        <input type="text" style={inputStyle} placeholder="発送元を入力または選択"
          value={open ? query : selectedName}
          onFocus={() => { setOpen(true); setQuery(selectedName); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); if (e.key === "Enter" && filtered[0]) { onChange(filtered[0].id); setQuery(""); setOpen(false); } }}
        />
        {open && (
          <ul style={dropdownStyle}>
            <li onClick={() => { onChange(null); setQuery(""); setOpen(false); }} style={{ cursor: "pointer", padding: `${spacing[2]}px ${spacing[3]}px`, fontSize: fontSize.sm, color: semantic.textMuted }}>（未選択）</li>
            {filtered.length === 0 && <li style={{ padding: `${spacing[2]}px ${spacing[3]}px`, fontSize: fontSize.sm, color: semantic.textMuted }}>一致する都道府県がありません</li>}
            {filtered.map((p) => <li key={p.id} onClick={() => { onChange(p.id); setQuery(""); setOpen(false); }} style={itemStyle(p.id === value)}>{p.name}</li>)}
          </ul>
        )}
      </div>
    </Labeled>
  );
}
