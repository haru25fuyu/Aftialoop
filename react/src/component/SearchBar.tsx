// src/component/SearchBar.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronRight, Bug, Package } from 'lucide-react'; // アイコン追加 (Bug:生体, Package:用品)
import api from '../conf/api';

// 検索結果の型定義
type CategorySuggestion = {
    id: number;
    name: string;
    type: 'category' | 'supply' | 'combination'; 
    full_path_name?: string;
    slug: string;
    full_slug_path?: string;
};

const SearchBar: React.FC = () => {
    const navigate = useNavigate();
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (keyword.length >= 1) {
                fetchSuggestions(keyword);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [keyword]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
                if (window.innerWidth < 768 && keyword === '') {
                    setIsOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [keyword]);

    const fetchSuggestions = async (input: string) => {
        try {
            // ★重要: バックエンド側で用品も検索して返すように修正が必要です
            const res = await api.get(`/api/categories/search?keyword=${encodeURIComponent(input)}`);
            if (res.data && Array.isArray(res.data)) {
                setSuggestions(res.data);
                setShowSuggestions(true);
            }
        } catch (error) {
            console.error("Suggestion fetch error:", error);
        }
    };

    const handleSearchSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!keyword.trim()) return;
        navigate(`/flea-market/list?keyword=${encodeURIComponent(keyword)}`);
        setShowSuggestions(false);
        setIsOpen(false);
    };

    const handleSuggestionClick = (item: CategorySuggestion) => {
        let targetUrl = "";
        console.log("Clicked item:", item);

        // 生体(category)か用品(supply)かに関わらず、
        // full_slug_path (例: "mammal/dog/food") があれば最優先でそれを使う。
        const path = item.full_slug_path || item.slug;

        if (path) {
            // これで「例のカタチ」になります
            // 例: /flea-market/category/mammal/dog/food
            targetUrl = `/flea-market/category/${path}`;
        } else {
            // 万が一パスがない場合の保険（ID指定のパラメータ検索へ）
            if (item.type === 'category') {
                targetUrl = `/flea-market/list?category_id=${item.id}`;
            } else {
                targetUrl = `/flea-market/list?type=SUPPLY&category_id=${item.id}`;
            }
        }

        navigate(targetUrl);
        setShowSuggestions(false);
        setIsOpen(false);
        setKeyword('');
    };

    const toggleSearch = () => {
        if (isOpen && keyword === '') {
            setIsOpen(false);
        } else {
            setIsOpen(true);
        }
    };

    return (
        <div ref={wrapperRef} className="relative z-50">
            {/* 検索バー本体 (変更なし) */}
            <div className={`
                flex items-center transition-all duration-300 ease-in-out
                ${isOpen ? 'w-full absolute top-0 left-0 right-0 px-4 bg-white h-[60px] md:relative md:h-auto md:w-auto md:bg-transparent md:px-0' : 'w-10 md:w-80'}
            `}>
                <form
                    onSubmit={handleSearchSubmit}
                    className={`
                        flex items-center w-full h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden
                        ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible md:opacity-100 md:visible'}
                        transition-all duration-200
                    `}
                >
                    <div className="pl-3 text-gray-400"><Search size={18} /></div>
                    <input
                        type="text"
                        className="w-full bg-transparent px-3 py-2 text-sm text-gray-700 focus:outline-none placeholder-gray-400"
                        placeholder="キーワードから探す"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    />
                    {keyword && (
                        <button type="button" onClick={() => { setKeyword(''); setIsOpen(true); }} className="pr-3 text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    )}
                </form>

                <button onClick={toggleSearch} className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-600 hover:bg-gray-100 rounded-full md:hidden ${isOpen ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
                    <Search size={24} />
                </button>
                {isOpen && (
                    <button onClick={() => setIsOpen(false)} className="ml-2 text-sm text-gray-500 whitespace-nowrap md:hidden">キャンセル</button>
                )}
            </div>

            {/* 予測変換（サジェスト）ドロップダウン */}
            {showSuggestions && suggestions.length > 0 && (isOpen || window.innerWidth >= 768) && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden py-1">
                    <div className="px-3 py-2 text-xs font-bold text-gray-400 bg-gray-50">
                        カテゴリー候補
                    </div>
                    <ul>
                        {suggestions.map((item) => (
                            <li key={`${item.type}-${item.id}`}> {/* key重複防止のためtypeも含める */}
                                <button
                                    onClick={() => handleSuggestionClick(item)}
                                    className="w-full text-left px-4 py-3 hover:bg-emerald-50 flex items-center justify-between group transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* ★ ここでアイコンとバッジを出し分け */}
                                        <div className={`p-2 rounded-full ${item.type === 'category' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {item.type === 'category' ? <Bug size={16} /> : <Package size={16} />}
                                        </div>

                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-700 font-medium group-hover:text-emerald-700">
                                                    {item.full_path_name ? item.full_path_name.replace(/ > /g, ' / ') : item.name}
                                                </span>
                                                {/* ラベルを表示 */}
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${item.type === 'category'
                                                    ? 'border-green-200 bg-green-50 text-green-600'
                                                    : 'border-orange-200 bg-orange-50 text-orange-600'
                                                    }`}>
                                                    {item.type === 'category' ? '生体' : '用品'}
                                                </span>
                                            </div>
                                            {item.slug && (
                                                <span className="text-[10px] text-gray-400 font-mono">{item.slug}</span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="border-t border-gray-100">
                        <button
                            onClick={handleSearchSubmit}
                            className="w-full text-left px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 font-bold flex items-center gap-2"
                        >
                            <Search size={14} />
                            「{keyword}」でキーワード検索
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchBar;