import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Edit2, Trash2, ImageOff, Clock, FileText, ChevronLeft } from "lucide-react";
import { Header } from "../component/Header";
import api from "../conf/api";
import { DraftItem } from "../types/FleaMarket";
import { CONFIG } from "../conf/config";
import { s } from "../styles/page/DraftList.styles";

export default function DraftListPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrafts = () => {
    setLoading(true);
    api.get("/flea-market/draft/list?limit=20&offset=0").then((res) => setDrafts(res.data.items || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchDrafts(); }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("この下書きを削除しますか？")) return;
    try { await api.delete(`/flea-market/draft/${id}`); setDrafts(prev => prev.filter(d => d.draft_id !== id)); }
    catch { alert("削除に失敗しました"); }
  };

  return (
    <div style={s.page}>
      <Header />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 24 }}>
          <button onClick={() => navigate(-1)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", borderRadius: "50%" }}><ChevronLeft size={24} style={{ color: "#5c5a56" }} /></button>
          <FileText size={20} style={{ color: "#1a5adc" }} />
          <h1 style={s.title}>下書き一覧</h1>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#8c8c8c" }}>読み込み中...</div>
        ) : drafts.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e0ddd8", color: "#8c8c8c" }}>下書きはありません</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {drafts.map((draft) => (
              <div key={draft.draft_id} style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e0ddd8", display: "flex", gap: 16 }}>
                <div style={{ width: 80, height: 80, backgroundColor: "#f0eeeb", borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {draft.main_image_url ? <img src={CONFIG.BASE_URL + draft.main_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageOff size={24} style={{ color: "#c4c1bb" }} />}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <h3 style={{ fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{draft.name || "タイトル未設定"}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
                      <Clock size={12} /><span>編集: {new Date(draft.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#5c5a56" }}>{draft.price ? `¥${Number(draft.price).toLocaleString()}` : "価格未定"}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, borderLeft: "1px solid #f0eeeb", paddingLeft: 16 }}>
                  <Link to={`/flea-market/sell/create/${draft.draft_id}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 700, color: "#1a5adc", textDecoration: "none", padding: "8px 12px", borderRadius: 8 }}>
                    <Edit2 size={16} /> 編集
                  </Link>
                  <button onClick={() => handleDelete(draft.draft_id)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 700, color: "#d63c20", background: "none", border: "none", cursor: "pointer", padding: "8px 12px", borderRadius: 8 }}>
                    <Trash2 size={16} /> 削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
