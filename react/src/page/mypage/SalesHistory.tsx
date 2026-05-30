import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../conf/api";
import { ArrowUpCircle, ArrowDownCircle, Wallet, History, ChevronLeft, Loader2 } from "lucide-react";
import { Header } from "../../component/Header";
import ExchangePointModal from "../../modal/ExchangePointModal";
import LoginModal from "../../modal/Login";
import PayoutModal from "../../modal/PayoutModal";
import { s } from "../../styles/page/mypage/SalesHistory.styles";

interface SalesHistoryItem { id: number; type: string; amount: number; balance_snapshot: number; note: string; created_at: string; }
interface SalesResponse { balance: number; histories: SalesHistoryItem[]; }

const yen = (n: number) => new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(n);
const formatDate = (d: string) => { const dt = new Date(d); return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2,'0')}`; };
const formatType = (t: string) => ({ SALE: "売上入金", WITHDRAWAL: "振込出金", ADJUSTMENT: "事務局調整", EXCHANGE: "ポイント交換" }[t] || t);

export default function SalesHistoryPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isExchangeModalOpen, setExchangeModalOpen] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get("/sales/history").then((res) => setData(res.data)).catch(() => setLoginModalOpen(true)).finally(() => setLoading(false));
  }, [reloadTrigger]);

  return (
    <div style={s.page}>
      <Header />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setLoginModalOpen(false)} onLoginSuccess={() => { setLoginModalOpen(false); setReloadTrigger(p => p+1); }} />
      {isPayoutModalOpen && <PayoutModal isOpen={isPayoutModalOpen} onClose={() => { setIsPayoutModalOpen(false); setReloadTrigger(p => p+1); }} />}
      {isExchangeModalOpen && <ExchangePointModal isOpen={isExchangeModalOpen} onClose={() => { setExchangeModalOpen(false); setReloadTrigger(p => p+1); }} currentBalance={data?.balance || 0} />}
      <div style={{ maxWidth: 512, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 24 }}>
          <button onClick={() => navigate(-1)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", borderRadius: "50%" }}><ChevronLeft size={24} /></button>
          <Wallet size={20} style={{ color: "#1a5adc" }} />
          <h1 style={s.title}>売上金</h1>
        </div>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Loader2 size={40} style={{ animation: "spin 0.7s linear infinite", color: "#8c8c8c" }} /></div>
        ) : data ? (
          <>
            <div style={s.balanceCard}>
              <div style={{ color: "#bbd0f8", fontSize: 14, marginBottom: 4 }}>現在の売上金残高</div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>¥{data.balance.toLocaleString()}</div>
              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <button onClick={() => setIsPayoutModalOpen(true)} style={s.actionBtn}>振込申請する</button>
                <button onClick={() => setExchangeModalOpen(true)} style={s.actionBtn}>ポイントに交換</button>
              </div>
            </div>
            <div style={s.historySection}>
              <div style={s.historyHeader}><History size={18} />入出金履歴</div>
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
                        <div style={{ fontWeight: 700, fontSize: 18, color: item.amount >= 0 ? "#3a7a22" : "#d63c20" }}>{item.amount >= 0 ? "+" : ""}{yen(item.amount)}</div>
                        <div style={{ fontSize: 12, color: "#8c8c8c" }}>残高 {yen(item.balance_snapshot)}</div>
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
