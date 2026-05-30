import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ClipboardCheck, Package } from "lucide-react";
import { Header } from "../../component/Header";
import api from "../../conf/api";
import { CONFIG } from "../../conf/config";
import { s } from "../../styles/page/mypage/RequestListPage.styles";

interface PurchaseRequestItem { id: number; item_id: number; item_name: string; item_main_image_url: string; buyer_name: string; created_at: string; status: string; }

export default function RequestListPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PurchaseRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get("/mypage/requests").then((res) => setRequests(res.data || [])).catch(console.error).finally(() => setLoading(false)); }, []);

  return (
    <>
      <Header />
      <div style={s.page}>
        <div style={s.header}>
          <button onClick={() => navigate(-1)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", borderRadius: "50%" }}><ChevronLeft size={24} /></button>
          <h1 style={s.title}>購入申請</h1>
        </div>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: "#8c8c8c" }}>読み込み中...</div> :
          requests.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ width: 64, height: 64, backgroundColor: "#f0eeeb", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={32} style={{ color: "#8c8c8c" }} /></div>
              <p style={{ color: "#8c8c8c", fontWeight: 700 }}>購入申請はありません</p>
            </div>
          ) : (
            <div style={s.list}>
              {requests.map((req) => (
                <Link key={req.id} to={`/flea-market/transactions/${req.id}`} style={s.card}>
                  <div style={{ width: 72, height: 72, borderRadius: 8, overflow: "hidden", flexShrink: 0, backgroundColor: "#f0eeeb" }}>
                    {req.item_main_image_url && <img src={CONFIG.BASE_URL + req.item_main_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.item_name}</div>
                    <div style={{ fontSize: 13, color: "#5c5a56" }}>購入希望者: {req.buyer_name}</div>
                    <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>{new Date(req.created_at).toLocaleDateString()}</div>
                  </div>
                  <ClipboardCheck size={20} style={{ color: "#c4c1bb", flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          )
        }
      </div>
    </>
  );
}
