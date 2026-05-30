import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { MoreVertical, Flag, Ban, Share2, Check } from "lucide-react";
import { Header } from "../component/Header";
import { Avatar } from "../component/Avatar";
import LoginModal from "../modal/Login";
import api from "../conf/api";
import { CONFIG } from "../conf/config";
import { UserProfileData, ListingItem } from "../types/FleaMarket";
import { FleaItemStatus } from "../conf/FleaMarket";
import { s } from "../styles/page/UserProfile.styles";

interface ReviewItem { id: number; rating: number; comment: string; createdAt: string; reviewerName: string; reviewerIconUrl: string; itemName?: string; }

const UserProfile: React.FC = () => {
  const params = useParams<{ username?: string; id?: string }>();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"listings" | "reviews">("listings");
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [listingHasMore, setListingHasMore] = useState(true);
  const [listingLoading, setListingLoading] = useState(false);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewHasMore, setReviewHasMore] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const LIMIT = 20;

  const fetchMe = () => { api.post('/customer', {}).then(res => { if (res.data.user) setMyUserId(res.data.user.id); }).catch(() => setMyUserId(null)); };
  useEffect(() => { fetchMe(); }, []);

  useEffect(() => {
    const idOrUsername = params.id || params.username;
    if (!idOrUsername) return;
    setProfileLoading(true);
    const endpoint = params.id ? `/user/profile/${params.id}` : `/user/${params.username}`;
    api.get(endpoint).then(res => setProfile(res.data)).catch(console.error).finally(() => setProfileLoading(false));
  }, [params.id, params.username]);

  const lastListingRef = useCallback((node: HTMLAnchorElement | null) => {
    if (listingLoading) return;
    if (!listingHasMore) return;
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) fetchListings(listings.length, false); });
    if (node) obs.observe(node);
  }, [listingLoading, listingHasMore, listings.length]);

  const lastReviewRef = useCallback((node: HTMLDivElement | null) => {
    if (reviewLoading) return;
    if (!reviewHasMore) return;
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) fetchReviews(reviews.length, false); });
    if (node) obs.observe(node);
  }, [reviewLoading, reviewHasMore, reviews.length]);

  const fetchListings = async (offset: number, reset: boolean) => {
    if (!profile) return;
    setListingLoading(true);
    try {
      const res = await api.get(`/user/profile/${profile.id}/listings?limit=${LIMIT}&offset=${offset}&status=${FleaItemStatus.Active}`);
      const items = res.data.items || [];
      setListings(prev => reset ? items : [...prev, ...items]);
      setListingHasMore(items.length === LIMIT);
    } catch { } finally { setListingLoading(false); }
  };

  const fetchReviews = async (offset: number, reset: boolean) => {
    if (!profile) return;
    setReviewLoading(true);
    try {
      const res = await api.get(`/user/profile/${profile.id}/reviews?limit=${LIMIT}&offset=${offset}`);
      const items = res.data.reviews || [];
      setReviews(prev => reset ? items : [...prev, ...items]);
      setReviewHasMore(items.length === LIMIT);
    } catch { } finally { setReviewLoading(false); }
  };

  useEffect(() => { if (profile && activeTab === "listings") fetchListings(0, true); }, [profile, activeTab]);
  useEffect(() => { if (profile && activeTab === "reviews") fetchReviews(0, true); }, [profile, activeTab]);

  const handleCopyLink = () => {
    const sharePath = profile?.username ? `/user/${profile.username}` : `/user/profile/${profile?.id}`;
    navigator.clipboard.writeText(`${window.location.origin}${sharePath}`).then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); });
  };

  const handleToggleFollow = async () => {
    if (!myUserId) { setLoginModalOpen(true); return; }
    if (!profile) return;
    const prev = profile.isFollowing;
    setProfile(p => p ? { ...p, isFollowing: !p.isFollowing, followersCount: p.isFollowing ? p.followersCount - 1 : p.followersCount + 1 } : null);
    try { if (prev) await api.delete(`/sns/users/${profile.id}/follow`); else await api.post(`/sns/users/${profile.id}/follow`, {}); }
    catch { alert("通信に失敗しました"); }
  };

  const handleBlock = async () => {
    setShowMenu(false);
    if (!myUserId) { setLoginModalOpen(true); return; }
    if (window.confirm("ブロックしますか？")) {
      try { await api.post(`/sns/users/${profile!.id}/block`, {}); setProfile(p => p ? { ...p, isBlocked: true } : null); alert("ブロックしました"); } catch { alert("失敗しました"); }
    }
  };

  if (profileLoading) return <div style={{ padding: 80, textAlign: "center", color: "#8c8c8c" }}>読み込み中...</div>;
  if (!profile) return <div style={{ padding: 80, textAlign: "center", color: "#8c8c8c" }}>ユーザーが見つかりません</div>;

  const isMe = String(myUserId) === String(profile.id);

  return (
    <div style={s.page}>
      <Header />
      <main style={{ maxWidth: 896, margin: "0 auto", padding: "16px 12px" }}>
        {/* プロフィールヘッダー */}
        <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e0ddd8", marginBottom: 24, position: "relative" }}>
          <div style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 8, zIndex: 10 }}>
            <button onClick={handleCopyLink} style={{ padding: 8, background: "none", border: "none", cursor: "pointer", borderRadius: "50%", color: isCopied ? "#3a7a22" : "#8c8c8c" }}>
              {isCopied ? <Check size={20} /> : <Share2 size={20} />}
            </button>
            {!isMe && (
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowMenu(!showMenu)} style={{ padding: 8, background: "none", border: "none", cursor: "pointer", borderRadius: "50%", color: "#8c8c8c" }}><MoreVertical size={20} /></button>
                {showMenu && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 20, cursor: "default" }} onClick={() => setShowMenu(false)} />
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, width: 192, backgroundColor: "#fff", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: "1px solid #e0ddd8", padding: "4px 0", zIndex: 30 }}>
                      <button style={{ width: "100%", textAlign: "left", padding: "12px 16px", fontSize: 14, color: "#2e3128", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer" }}><Flag size={16} />通報する</button>
                      <button onClick={handleBlock} style={{ width: "100%", textAlign: "left", padding: "12px 16px", fontSize: 14, color: "#d63c20", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", borderTop: "1px solid #f0eeeb" }}><Ban size={16} />ブロックする</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Avatar src={profile.iconUrl} name={profile.name} size={96} />
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>{profile.name}</h1>
              {profile.username && <p style={{ color: "#8c8c8c", marginTop: 2 }}>@{profile.username}</p>}
            </div>
            <div style={s.statsRow}>
              {[["フォロー", profile.followingCount], ["フォロワー", profile.followersCount]].map(([label, val]) => (
                <div key={label as string} style={s.statItem}><div style={s.statValue}>{val}</div><div style={s.statLabel}>{label}</div></div>
              ))}
            </div>
            {!isMe && (
              <div style={s.actionRow}>
                <button onClick={handleToggleFollow} style={s.followBtn(profile.isFollowing)}>
                  {profile.isFollowing ? "フォロー中" : "フォローする"}
                </button>
                <button onClick={handleBlock} style={s.blockBtn}>ブロック</button>
              </div>
            )}
          </div>
        </div>

        {/* タブ */}
        <div style={{ display: "flex", borderBottom: "1px solid #e0ddd8", marginBottom: 16 }}>
          {[["listings", "出品中"], ["reviews", "評価"]].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)}
              style={{ flex: 1, padding: "12px 0", fontSize: 14, fontWeight: 700, border: "none", background: "none", cursor: "pointer", color: activeTab === tab ? "#1a1a1a" : "#8c8c8c", borderBottom: activeTab === tab ? "2px solid #1a1a1a" : "2px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>

        {/* 出品一覧 */}
        {activeTab === "listings" && (
          <div style={s.grid}>
            {listings.map((item, i) => (
              <a key={item.id} ref={i === listings.length - 1 ? lastListingRef : null} href={`/flea-market/item/${item.id}`} style={s.itemCard}>
                <img src={item.main_image_url ? CONFIG.BASE_URL + item.main_image_url : "/data/Logo.png"} alt={item.name} style={s.itemImg} />
                <div style={s.itemBody}>
                  <div style={s.itemName}>{item.name}</div>
                  <div style={s.itemPrice}>¥{item.price.toLocaleString()}</div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* 評価一覧 */}
        {activeTab === "reviews" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reviews.map((review, i) => (
              <div key={review.id} ref={i === reviews.length - 1 ? lastReviewRef : null}
                style={{ backgroundColor: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e0ddd8" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <Avatar src={review.reviewerIconUrl} name={review.reviewerName} size={36} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{review.reviewerName}</p>
                    <div style={{ color: "#f0a800", fontSize: 12 }}>{"★".repeat(review.rating)}<span style={{ color: "#e0ddd8" }}>{"★".repeat(5 - review.rating)}</span></div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "#8c8c8c" }}>{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                {review.itemName && <div style={{ fontSize: 12, color: "#8c8c8c", backgroundColor: "#f8f7f5", padding: "2px 8px", borderRadius: 6, display: "inline-block", marginBottom: 8 }}>購入商品: {review.itemName}</div>}
                <p style={{ fontSize: 14, color: "#5c5a56", lineHeight: 1.6 }}>{review.comment || "コメントなし"}</p>
              </div>
            ))}
            {!reviewLoading && reviews.length === 0 && <div style={{ textAlign: "center", padding: 80, color: "#8c8c8c" }}>まだ評価はありません</div>}
          </div>
        )}
      </main>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setLoginModalOpen(false)} onLoginSuccess={() => { setLoginModalOpen(false); fetchMe(); }} showCloseButton />
    </div>
  );
};

export default UserProfile;
