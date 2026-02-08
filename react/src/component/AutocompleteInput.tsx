import React, { useState, useEffect, useRef } from "react";
import api from "../conf/api"; // あなたのプロジェクトのAPI設定に合わせてください

type Suggestion = {
    id: number;
    name: string;
    full_path_name?: string; // APIが返すパンくずリスト
    rank?: string;
    // 必要に応じて他のフィールドも追加
};

interface AutocompleteInputProps {
    value: string;
    onChange: (val: string) => void;
    onSelect: (item: Suggestion) => void;
    placeholder?: string;
    className?: string;
    error?: string;
}

export default function AutocompleteInput({
    value,
    onChange,
    onSelect,
    placeholder,
    className,
    error,
}: AutocompleteInputProps) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // デバウンス用タイマー
    const timerRef = useRef<number | null>(null);

    // 外部クリックで閉じる
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 入力が変わったらAPIを叩く
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);

        if (!val.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // デバウンス処理（0.3秒待ってから検索）
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(async () => {
            try {
                // ★ここで検索APIを呼び出す
                const res = await api.get(`/api/categories/search?keyword=${encodeURIComponent(val)}`);
                if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                    setSuggestions(res.data);
                    setShowSuggestions(true);
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            } catch (err) {
                console.error("Autocomplete search failed", err);
            }
        }, 300);
    };

    const handleSelect = (item: Suggestion) => {
        onChange(item.name); // 名前を入力欄にセット
        onSelect(item);      // 親コンポーネントに通知
        setShowSuggestions(false);
        setSuggestions([]);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <input
                type="text"
                className={className}
                value={value}
                onChange={handleInputChange}
                placeholder={placeholder}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

            {/* 候補リスト */}
            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {suggestions.map((item) => (
                        <li
                            key={item.id}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none"
                            onClick={() => handleSelect(item)}
                        >
                            <div className="text-sm font-bold text-gray-800">{item.name}</div>
                            {item.full_path_name && (
                                <div className="text-xs text-gray-500">{item.full_path_name}</div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
