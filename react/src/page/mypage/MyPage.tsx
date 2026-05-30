import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Settings, ChevronRight, Wallet, Coins, ShoppingBag, Package, List, Heart, LogOut, MapPin, CreditCard, Truck, ClipboardCheck } from "lucide-react";
import { Header } from "../../component/Header";
import api from "../../conf/api";
import { CONFIG, IDENTITY_STATUS } from "../../conf/config";
import { s } from "../../styles/page/mypage/MyPage.styles";

interface UserProfile { id: string; name: string; icon_url: string; point: number; sales_balance: number; listings_count: number; followers_count: number; following_count: number; identity_status?: string; pending_requests_count: number; active_transactions_count: number; }

const MenuItem = ({ icon, label, to, sub, badge }: { icon: React.ReactNode; label: string; to: string; sub?: string; badge?: number }) => (
  <Link to={to} style={s.menuItem}>
    <span style={{ color: "#8c8c8c" }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <div style={s.menuLabel}>{label}</div>
      {sub && <div style={s.menuSub}>{sub}</div>}
    </div>
    {badge ? <span style={s.badge}>{badge}</span> : null}
    <ChevronRight size={16} style={{ color: "#c4c1bb" }} />
  </Link>
);

export default function MyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    api.post("/mypage").then((res) => {
      if (!res.data.user) { navigate("/login"); return; }
      setUser(res.data.user);
    });
  }, []);

  if (!user) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <>
      <Header />
      <div style={s.page}>
        {/* プロフィールエリア */}
        <div style={s.profileArea}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", border: "1px solid #e0ddd8", backgroundColor: "#f0eeeb", flexShrink: 0 }}>
              {user.icon_url ? <img src={CONFIG.BASE_URL + user.icon_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={32} style={{ color: "#8c8c8c" }} /></div>}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={s.profileName}>{user.name}</h1>
              <Link to="/mypage/profile" style={{ fontSize: 12, color: "#8c8c8c" }}>プロフィールを編集 &gt;</Link>
            </div>
          </div>
          <div style={s.statsRow}>
            {[["出品数", user.listings_count], ["フォロー", user.following_count], ["フォロワー", user.followers_count]].map(([label, val], i, arr) => (
              <div key={label as string} style={{ flex: 1, textAlign: "center", borderRight: i < arr.length - 1 ? "1px solid #e0ddd8" : "none" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{val}</div>
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 売上・ポイント */}
        <div style={s.balanceGrid}>
          <Link to="/mypage/sales" style={s.balanceCard}>
            <div style={s.balanceLabel}><Wallet size={18} style={{ color: "#1a5adc" }} />売上金</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>¥{(user.sales_balance ?? 0).toLocaleString()}</div>
          </Link>
          <Link to="/mypage/points" style={s.balanceCard}>
            <div style={s.balanceLabel}><Coins size={18} style={{ color: "#3a7a22" }} />ポイント</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>{user.point.toLocaleString()}pt</div>
          </Link>
        </div>

        {/* 取引カード */}
        <div style={s.txGrid}>
          {[
            { to: "/mypage/requests", icon: <ClipboardCheck size={18} />, label: "購入申請", count: user.pending_requests_count },
            { to: "/mypage/transactions/active", icon: <Truck size={18} />, label: "取引中", count: user.active_transactions_count },
          ].map(({ to, icon, label, count }) => (
            <Link key={to} to={to} style={s.txCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14 }}>{icon}{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{count}<span style={{ fontSize: 12, fontWeight: 400, color: "#8c8c8c" }}>件</span></div>
            </Link>
          ))}
        </div>

        {/* メニューリスト */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "0 16px", marginTop: 24 }}>
          {[
            { heading: "お買い物・取引", items: [{ icon: <ShoppingBag size={20} />, label: "購入した商品・取引履歴", to: "/mypage/transactions/history", sub: "完了した取引はこちら" }, { icon: <Heart size={20} />, label: "いいね！した商品", to: "/mypage/likes" }] },
            { heading: "出品・販売", items: [{ icon: <List size={20} />, label: "出品した商品", to: "/mypage/selling/list" }, { icon: <Package size={20} />, label: "下書き一覧", to: "/mypage/drafts/list" }] },
            { heading: "設定・アカウント", items: [{ icon: <MapPin size={20} />, label: "お届け先住所の管理", to: "/mypage/address" }, { icon: <CreditCard size={20} />, label: "支払い方法", to: "/mypage/payment" }, { icon: <Settings size={20} />, label: "アカウント設定", to: "/mypage/settings" }] },
          ].map(({ heading, items }) => (
            <section key={heading} style={s.section}>
              <h2 style={s.sectionHeading}>{heading}</h2>
              <div style={s.sectionBody}>
                {items.map((item) => <MenuItem key={item.to} {...item} />)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
