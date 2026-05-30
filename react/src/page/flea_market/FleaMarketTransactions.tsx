import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchFleaTransactionDetail, calcTxPhase, TxPhase } from "../../conf/FleaMarket";
import api from '../../conf/api';
import { FleaThreadResponse } from "../../types/FleaMarket";

import TxHeader from "../../component/TxHeader";
import TxTimeline from "../../component/TxTimeline";
import PhasePanel from "../../component/FleaMarket/FleaMarketPhases/PhasePanel";
import SellerSetTerms from "../../component/FleaMarket/FleaMarketPhases/SellerSetTerms";
import Header from "../../component/Header";
import LoginModal from '../../modal/Login';

import { s } from "../../styles/page/flea_market/FleaMarketTransactions.styles";

export default function FleaTransactionPage() {
  const { id } = useParams();
  const [data, setData] = useState<FleaThreadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const checkLoginStatus = async () => {
    try {
      const res = await api.post("customer");
      if (!res.data.user || !res.data.user.id) { setLoginModalOpen(true); setIsLoggedIn(false); setMyUserId(null); }
      else { setIsLoggedIn(true); setMyUserId(res.data.user.id); load(); }
    } catch { setLoginModalOpen(true); setIsLoggedIn(false); }
  };

  const handleLoginSuccess = () => { setLoginModalOpen(false); setIsLoggedIn(true); load(); };

  async function load() {
    if (!id) return;
    setLoading(true); setErr(null);
    try { const d = await fetchFleaTransactionDetail(id); setData(d); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => { checkLoginStatus(); }, [id]);

  const phase: TxPhase | null = useMemo(() => {
    if (!data) return null;
    if (data.kind === "purchase_request") return "SELLER_SET_TERMS";
    if (!data.transaction) return null;
    return calcTxPhase(data.transaction, data.role);
  }, [data]);

  if (isLoginModalOpen) return <LoginModal isOpen={isLoginModalOpen} onClose={() => setLoginModalOpen(false)} onLoginSuccess={handleLoginSuccess} showCloseButton={false} />;
  if (!isLoggedIn) return null;
  if (loading) return <div style={s.loadingWrap}>読み込み中…</div>;
  if (err) return (
    <div style={s.errWrap}>
      <div style={s.errText}>取引の取得に失敗: {err}</div>
      <button style={s.retryBtn} onClick={load}>再読み込み</button>
    </div>
  );
  if (!data || !phase) return <div style={s.emptyWrap}>データなし</div>;

  if (data.kind === "purchase_request") {
    return (
      <>
        <Header />
        <div style={s.requestWrap}>
          <SellerSetTerms pr={data.purchase_request} myUserId={myUserId!} role={data.role} item={data.item} buyer_address={data.address} onChanged={load} />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div style={s.txWrap}>
        <TxHeader data={data} phase={phase} />
        <TxTimeline phase={phase} />
        <PhasePanel data={data} myUserId={myUserId!} phase={phase} onChanged={load} />
      </div>
    </>
  );
}
