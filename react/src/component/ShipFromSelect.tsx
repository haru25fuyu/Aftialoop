import { useState, useRef, useEffect } from "react";
import { PREFS } from "../conf/config";
import { Labeled } from "./Labeled";

export default function ShipFromSelect({
    value,
    onChange,
    error,
}: {
    value: number | null;                     // ← null許容
    onChange: (val: number | null) => void;  // ← null許容
    error?: string;
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const filtered = PREFS.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
    );

    // 外クリックで閉じる
    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    const selectedName = value != null ? (PREFS.find((p) => p.id === value)?.name ?? "") : "";

    return (
        <Labeled label="発送元" error={error}>
            <div ref={ref} className="relative">
                {/* 入力欄 */}
                <input
                    type="text"
                    className="input w-full"
                    placeholder="発送元を入力または選択"
                    value={open ? query : selectedName}
                    onFocus={() => {
                        setOpen(true);
                        setQuery(selectedName);
                    }}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setOpen(false);
                        if (e.key === "Enter" && filtered[0]) {
                            onChange(filtered[0].id);
                            setQuery("");
                            setOpen(false);
                        }
                    }}
                />

                {/* ドロップダウン */}
                {open && (
                    <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-white shadow">
                        {/* 未選択に戻す */}
                        <li
                            onClick={() => {
                                onChange(null);
                                setQuery("");
                                setOpen(false);
                            }}
                            className="cursor-pointer px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                        >
                            （未選択）
                        </li>

                        {filtered.length === 0 && (
                            <li className="px-3 py-2 text-sm text-gray-400">
                                一致する都道府県がありません
                            </li>
                        )}
                        {filtered.map((p) => (
                            <li
                                key={p.id}
                                onClick={() => {
                                    onChange(p.id);
                                    setQuery("");
                                    setOpen(false);
                                }}
                                className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 ${p.id === value ? "bg-gray-50 font-semibold" : ""
                                    }`}
                            >
                                {p.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Labeled>
    );
}
