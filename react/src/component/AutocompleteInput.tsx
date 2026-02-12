import React, { useState, useEffect, useRef } from "react";
import api from "../conf/api";

export type Suggestion = {
    id: number;
    name: string;
    type?: string;
    is_supply?: boolean;
    built_in_type?: string;
    full_path_name?: string;
};

interface AutocompleteInputProps {
    value: string;
    type?: "ANIMAL" | "SUPPLY";
    onChange: (val: string) => void;
    onSelect: (item: Suggestion) => void;
    placeholder?: string;
    className?: string;
    error?: string;
    shouldReplaceValue?: boolean;
}

export default function AutocompleteInput({
    value,
    type = "ANIMAL",
    onChange,
    onSelect,
    placeholder,
    className,
    error,
    shouldReplaceValue = false,
}: AutocompleteInputProps) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<number | null>(null);

    // ★デフォルトのスタイル定義 (BasicInfoSectionで使っていたものと同じスタイル)
    const defaultInputClass = "w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3 transition-colors";

    // 親から className が来ていればそれを使い、なければデフォルトを使う
    // (マージしたい場合は `${defaultInputClass} ${className || ""}` のように書きますが、今回は上書き優先にしています)
    const inputClass = className || defaultInputClass;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);

        if (!val.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(async () => {
            try {
                const res = await api.get(`/api/categories/search?keyword=${encodeURIComponent(val)}&type=${type}`);
                if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                    setSuggestions(res.data);
                    setShowSuggestions(true);
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            } catch (err) {
                console.error(err);
            }
        }, 300);
    };

    const handleSelect = (item: Suggestion) => {
        if (shouldReplaceValue) {
            onChange(item.name);
        }
        onSelect(item);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    return (
        <div ref={wrapperRef} className="w-full">
            <div className="relative">
                <input
                    type="text"
                    className={inputClass}
                    value={value}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                />
            </div>

            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

            {showSuggestions && suggestions.length > 0 && (
                <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1">
                    {!shouldReplaceValue && (
                        <div className="bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 flex items-center gap-1">
                            <span>💡</span> カテゴリーの提案（タップして設定）
                        </div>
                    )}
                    <ul className="max-h-60 overflow-y-auto">
                        {suggestions.map((item, index) => (
                            <li
                                key={`${item.type || 'unknown'}-${item.id}-${index}`}
                                className="px-4 py-3 hover:bg-blue-100 cursor-pointer border-b border-blue-100 last:border-none transition-colors"
                                onClick={() => handleSelect(item)}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-gray-800">{item.name}</div>
                                        {item.full_path_name && (
                                            <div className="text-xs text-gray-500 mt-0.5">{item.full_path_name}</div>
                                        )}
                                    </div>
                                    {!shouldReplaceValue && (
                                        <span className="text-xs bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded-full whitespace-nowrap ml-2 shadow-sm">
                                            設定
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}