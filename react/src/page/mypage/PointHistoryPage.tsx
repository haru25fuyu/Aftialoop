import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../conf/api";
import { Loader2, ArrowUpCircle, ArrowDownCircle, Coins, History, ChevronLeft } from "lucide-react";
import { Header } from "../../component/Header";
import LoginModal from "../../modal/Login";
import { s } from "../../styles/page/mypage/PointHistoryPage.styles";

interface PointHistoryItem { id: number; type: string; amount: number; balance_snapshot: number; note: string; created_at: string; }
interface PointResponse { current_points: number; histories: PointHistoryItem[]; }

const pt = (n: number | undefined) => `${(n ?? 0).toLocaleString()} pt`;
const formatDate = (d: string) => { const dt = new Date(d); return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2,'0')}`; };
const formatType = (t: string) => ({ EARNED: "獲得", CONSUMED: "利用", EXPIRED: "有効期限切れ", EXCHANGE: "売上金から交換", ADJUSTMENT: "事務局調整" }[t] || t);

export default function PointHistoryPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PointResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get("/point/my/history").then((res) => setData(res.data)).catch(() => setLoginModalOpen(true)).finally(() => setLoading(false));
  }, [reloadTrigger]);

  return (
    <div style={s.page}>
      <Header />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setLoginModalOpen(false)} onLoginSuccess={() => { setLoginModalOpen(false); setReloadTrigger(p => p+1); }} />
      <div style={{ maxWidth: 512, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 24 }}>
          <button onClick={() => navigate(-1)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", borderRadius: "50%" }}><ChevronLeft size={24} /></button>
          <Coins size={20} style={{ color: "#3a7a22" }} />
          <h1 style={s.title}>ポイント</h1>
        </div>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Loader2 size={40} style={{ animation: "spin 0.7s linear infinite", color: "#8c8c8c" }} /></div>
        ) : data ? (
          <>
            <div style={s.balanceCard}>
              <div style={{ color: "#a0d0b0", fontSize: 14, marginBottom: 4 }}>現在のポイント残高</div>
              <div style={{ fontSize: 36, fontWeight: 700 }}>{pt(data.current_points)}</div>
            </div>
            <div style={s.historySection}>
              <div style={s.historyHeader}><History size={18} />ポイント履歴</div>
              {(!data.histories || data.histories.length === 0) ? (
                <div style={{ padding: 32, textAlign: "center", color: "#8c8c8c" }}>履歴はまだありません</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {data.histories.map((item) => (
                    <div key={item.id} style={s.historyItem}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ color: item.amount >= 0 ? "#3a7a22" : "#d63c20", marginTop: 2 }}>{item.amount >= 0 ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}</div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#1a1a1a" }}>{item.note || formatType(item.type)}</div>
                          <div style={{ fontSize: 12, color: "#8c8c8c" }}>{formatDate(item.created_at)}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: 18, color: item.amount >= 0 ? "#3a7a22" : "#d63c20" }}>{item.amount >= 0 ? "+" : ""}{item.amount.toLocaleString()} pt</div>
                        <div style={{ fontSize: 12, color: "#8c8c8c" }}>残高 {pt(item.balance_snapshot)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
