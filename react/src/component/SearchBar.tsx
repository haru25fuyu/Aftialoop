import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronRight } from "lucide-react";
import api from "../conf/api";
import { s } from "../styles/component/SearchBar.styles";

type CategorySuggestion = { id: number; name: string; type: "category" | "supply" | "combination"; full_path_name?: string; slug: string; full_slug_path?: string; };

const SearchBar: React.FC = () => {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [keyword, setKeyword] = useState("");
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyword.length >= 1) {
        api.get(`/api/categories/search?keyword=${encodeURIComponent(keyword)}`)
          .then((res) => { if (Array.isArray(res.data)) { setSuggestions(res.data); setShowSuggestions(true); } })
          .catch(console.error);
      } else { setSuggestions([]); setShowSuggestions(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    const handle = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSuggestions(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (keyword.trim()) { navigate(`/flea-market/list?keyword=${encodeURIComponent(keyword.trim())}`); setShowSuggestions(false); }
  };

  const handleSelect = (item: CategorySuggestion) => {
    const path = item.type === "supply" ? `/flea-market/category/supply/${item.slug}` : `/flea-market/category/${item.full_slug_path || item.slug}`;
    navigate(path);
    setKeyword("");
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} style={s.wrap}>
      <div style={s.form} onSubmit={handleSearchSubmit as any}>
        <span style={s.icon}><Search size={16} /></span>
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} style={s.input} placeholder="生き物・用品を検索" onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()} />
        {keyword && <button type="button" onClick={() => { setKeyword(""); setShowSuggestions(false); }} style={s.clearBtn}><X size={14} /></button>}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div style={s.dropdown}>
          <ul>
            {suggestions.map((item) => (
              <li key={item.id}>
                <button onClick={() => handleSelect(item)} style={s.dropdownItem}>
                  <span>{item.full_path_name || item.name}</span>
                  <span style={item.type === "category" ? s.tagCategory : s.tagSupply}>{item.type === "category" ? "生体" : "用品"}</span>
                </button>
              </li>
            ))}
          </ul>
          <div style={s.dropdownFooter}>
            <button onClick={() => handleSearchSubmit()} style={s.dropdownFooter}><Search size={14} />「{keyword}」でキーワード検索</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
