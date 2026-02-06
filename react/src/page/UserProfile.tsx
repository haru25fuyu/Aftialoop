import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";

import Header from "../component/Header";
import { Avatar } from "../component/Avatar";
import LoginModal from "../modal/Login";
import ReportUserModal from "../modal/ReportUserModal";

import api from "../conf/api";
import { CONFIG } from "../conf/config";
import { UserProfileData, ListingItem } from "../types/FleaMarket"; // ListingItemを追加
import { FleaItemStatus } from "../conf/FleaMarket";

import { MoreVertical, Flag, Ban, Share2, Check } from "lucide-react";

// 評価データの型定義 (必要に応じて types/FleaMarket.ts に移動してください)
interface ReviewItem {
    id: number;
    rating: number;
    comment: string;
    createdAt: string;
    reviewerName: string;
    reviewerIconUrl: string;
    itemName?: string;
}

const UserProfile: React.FC = () => {
    const params = useParams<{ username?: string; id?: string }>();

    // プロフィール基本情報
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    // リスト用State
    const [activeTab, setActiveTab] = useState<"listings" | "reviews">("listings");

    // 出品リスト
    const [listings, setListings] = useState<ListingItem[]>([]);
    const [listingOffset, setListingOffset] = useState(0);
    const [listingHasMore, setListingHasMore] = useState(true);
    const [listingLoading, setListingLoading] = useState(false);

    // 評価リスト
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [reviewOffset, setReviewOffset] = useState(0);
    const [reviewHasMore, setReviewHasMore] = useState(true);
    const [reviewLoading, setReviewLoading] = useState(false);

    // 共通
    const [myUserId, setMyUserId] = useState<string | null>(null);
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    const [isReportModalOpen, setReportModalOpen] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const LIMIT = 20;

    // 自分自身のID取得
    const fetchMe = () => {
        api.post('/customer', {})
            .then(res => { if (res.data.user) setMyUserId(res.data.user.id); })
            .catch(() => setMyUserId(null));
    };
    useEffect(() => { fetchMe(); }, []);

    // 1. プロフィール基本情報の取得
    useEffect(() => {
        const fetchProfile = async () => {
            if (!params.id && !params.username) return;
            try {
                setProfileLoading(true);
                let res;
                if (params.id) {
                    res = await api.get(`/users/id/${params.id}/profile`);
                } else if (params.username) {
                    res = await api.get(`/users/username/${params.username}/profile`);
                }
                if (res && res.data) {
                    setProfile(res.data);
                    // ★初期ロード時はリストをリセットして、1ページ目を取得させる
                    setListings([]);
                    setListingOffset(0);
                    setListingHasMore(true);

                    setReviews([]);
                    setReviewOffset(0);
                    setReviewHasMore(true);
                }
            } catch (error) {
                console.error("Failed to fetch user profile", error);
            } finally {
                setProfileLoading(false);
            }
        };
        fetchProfile();
    }, [params.id, params.username]);

    // 2. 出品リストの取得 (profile.id が確定してから)
    useEffect(() => {
        if (!profile?.id) return;
        const fetchListings = async () => {
            setListingLoading(true);
            try {
                const res = await api.get(`/users/${profile.id}/listings?limit=${LIMIT}&offset=${listingOffset}`);
                const newItems = res.data.items || [];

                setListings(prev => {
                    // 重複排除 (念のため)
                    const exists = new Set(prev.map(i => i.id));
                    const filtered = newItems.filter((i: ListingItem) => !exists.has(i.id));
                    return [...prev, ...filtered];
                });

                if (newItems.length < LIMIT) setListingHasMore(false);
            } catch (err) {
                console.error(err);
            } finally {
                setListingLoading(false);
            }
        };
        fetchListings();
    }, [profile?.id, listingOffset]);

    // 3. 評価リストの取得
    useEffect(() => {
        if (!profile?.id) return;
        // タブがreviewsでない場合でも裏で取っておくか、タブ切り替え時に取るか。
        // ここでは「タブがreviewsの時」または「初回」に取る制御も可能ですが、シンプルに両方取れるようにしておきます。
        // ただし、無駄な通信を避けるなら `activeTab === 'reviews'` の判定を入れても良いです。
        if (activeTab !== 'reviews' && reviewOffset === 0 && reviews.length === 0) {
            // 初回切り替え前は待機、またはここを削除して常時取得
            return;
        }

        const fetchReviews = async () => {
            setReviewLoading(true);
            try {
                const res = await api.get(`/users/${profile.id}/reviews?limit=${LIMIT}&offset=${reviewOffset}`);
                const newItems = res.data.reviews || [];

                setReviews(prev => {
                    const exists = new Set(prev.map(i => i.id));
                    const filtered = newItems.filter((i: ReviewItem) => !exists.has(i.id));
                    return [...prev, ...filtered];
                });

                if (newItems.length < LIMIT) setReviewHasMore(false);
            } catch (err) {
                console.error(err);
            } finally {
                setReviewLoading(false);
            }
        };
        fetchReviews();
    }, [profile?.id, reviewOffset, activeTab]);

    // --- 無限スクロール用 Observer ---
    const observer = useRef<IntersectionObserver | null>(null);

    // 出品リスト用センチネル
    const lastListingRef = useCallback((node: HTMLAnchorElement | null) => {
        if (listingLoading) return;
        if (activeTab !== "listings") return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && listingHasMore) {
                setListingOffset(prev => prev + LIMIT);
            }
        });
        if (node) observer.current.observe(node);
    }, [listingLoading, listingHasMore, activeTab]);

    // 評価リスト用センチネル
    const lastReviewRef = useCallback((node: HTMLDivElement | null) => {
        if (reviewLoading) return;
        if (activeTab !== "reviews") return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && reviewHasMore) {
                setReviewOffset(prev => prev + LIMIT);
            }
        });
        if (node) observer.current.observe(node);
    }, [reviewLoading, reviewHasMore, activeTab]);


    // --- 各種アクションハンドラ ---
    const handleCopyLink = () => {
        if (!profile) return;
        const sharePath = profile.username ? `/user/${profile.username}` : `/user/profile/${profile.id}`;
        navigator.clipboard.writeText(`${window.location.origin}${sharePath}`).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const handleLoginSuccess = () => { setLoginModalOpen(false); fetchMe(); };

    const handleToggleFollow = async () => {
        if (!myUserId) { setLoginModalOpen(true); return; }
        if (!profile) return;
        const prevIsFollowing = profile.isFollowing;
        setProfile(prev => prev ? { ...prev, isFollowing: !prev.isFollowing, followersCount: prev.isFollowing ? prev.followersCount - 1 : prev.followersCount + 1 } : null);
        try {
            if (prevIsFollowing) await api.delete(`/sns/users/${profile.id}/follow`);
            else await api.post(`/sns/users/${profile.id}/follow`, {});
        } catch (e) {
            console.error(e);
            alert("通信に失敗しました");
        }
    };
    const handleReportClick = () => { setShowMenu(false); if (!myUserId) { setLoginModalOpen(true); return; } setReportModalOpen(true); };
    const handleReportSubmit = async (reason: string, details: string) => {
        try { await api.post(`/sns/users/${profile!.id}/report`, { reason, details }); setReportModalOpen(false); alert("通報しました"); } catch { alert("失敗しました"); }
    };
    const handleBlock = async () => {
        setShowMenu(false); if (!myUserId) { setLoginModalOpen(true); return; }
        if (window.confirm("ブロックしますか？")) {
            try { await api.post(`/sns/users/${profile!.id}/block`, {}); setProfile(prev => prev ? { ...prev, isBlocked: true } : null); alert("ブロックしました"); } catch { alert("失敗しました"); }
        }
    };
    const handleUnblock = async () => {
        if (!myUserId) return;
        if (window.confirm("解除しますか？")) {
            try { await api.delete(`/sns/users/${profile!.id}/block`); setProfile(prev => prev ? { ...prev, isBlocked: false } : null); alert("解除しました"); } catch { alert("失敗しました"); }
        }
    };

    if (profileLoading) return <div className="p-20 text-center text-gray-500">読み込み中...</div>;
    if (!profile) return <div className="p-20 text-center text-gray-500">ユーザーが見つかりません</div>;

    const isMe = String(myUserId) === String(profile.id);

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />

            <main className="w-full max-w-4xl mx-auto px-3 pt-4 md:px-4 md:pt-6">
                {/* ユーザー情報ヘッダーエリア */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6 relative">

                    {/* 右上アイコン群 */}
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                        <button onClick={handleCopyLink} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors relative group">
                            {isCopied ? <Check size={20} className="text-emerald-500" /> : <Share2 size={20} />}
                        </button>
                        {!isMe && (
                            <div className="relative">
                                <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                    <MoreVertical size={20} />
                                </button>
                                {showMenu && (
                                    <>
                                        <div className="fixed inset-0 z-20 cursor-default" onClick={() => setShowMenu(false)}></div>
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30">
                                            <button onClick={handleReportClick} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Flag size={16} /> 通報する</button>
                                            <button onClick={handleBlock} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-50"><Ban size={16} /> ブロックする</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* アバター */}
                    <div className="flex-shrink-0 mx-auto md:mx-0">
                        <Avatar src={profile.iconUrl} name={profile.name} className="w-24 h-24 md:w-32 md:h-32 border-4 border-white shadow-md text-3xl md:text-5xl" />
                    </div>

                    {/* 詳細 */}
                    <div className="flex-1 w-full space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 text-center md:text-left pr-8">{profile.name}</h1>
                                {profile.username && <p className="text-gray-500 text-center md:text-left">@{profile.username}</p>}
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-1"><span className="text-orange-400">★</span><span className="font-bold text-gray-900">{profile.ratingAverage.toFixed(1)}</span><span className="text-xs">({profile.ratingCount})</span></div>
                                    <div className="w-px h-3 bg-gray-300"></div>
                                    <div className="flex items-center gap-1"><span className="font-bold text-gray-900">{profile.followersCount}</span><span className="text-xs">フォロワー</span></div>
                                    <div className="w-px h-3 bg-gray-300"></div>
                                    <div className="flex items-center gap-1"><span className="font-bold text-gray-900">{profile.followingCount}</span><span className="text-xs">フォロー中</span></div>
                                </div>
                            </div>

                            {!isMe ? (
                                <div className="flex justify-center md:justify-end">
                                    {profile.isBlocked ? (
                                        <button onClick={handleUnblock} className="px-6 py-2 rounded-full font-bold bg-red-50 text-red-600 border border-red-200">ブロック中</button>
                                    ) : (
                                        <button onClick={handleToggleFollow} className={`px-6 py-2 rounded-full font-bold border ${profile.isFollowing ? "bg-white text-gray-500 border-gray-300" : "bg-emerald-600 text-white border-emerald-600"}`}>
                                            {profile.isFollowing ? "フォロー中" : "フォローする"}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex justify-center md:justify-end">
                                    <Link to="/mypage/profile" className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-full">プロフィール編集</Link>
                                </div>
                            )}
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.description || "自己紹介文はまだ設定されていません。"}</div>
                    </div>
                </div>

                {/* タブ切り替え */}
                <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl px-4 shadow-sm">
                    <button className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === "listings" ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"}`} onClick={() => setActiveTab("listings")}>
                        出品商品
                    </button>
                    <button className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === "reviews" ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"}`} onClick={() => setActiveTab("reviews")}>
                        評価一覧
                    </button>
                </div>

                {/* リスト表示エリア */}
                <div className="min-h-[300px]">
                    {activeTab === "listings" ? (
                        <>
                            {listings.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                                    {listings.map((item, index) => (
                                        <Link
                                            key={`${item.id}-${index}`}
                                            ref={index === listings.length - 1 ? lastListingRef : null}
                                            to={`/flea-market/item/${item.id}`}
                                            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
                                        >
                                            <div className="relative aspect-square bg-gray-100">
                                                <img src={item.main_image_url ? CONFIG.BASE_URL + item.main_image_url : "/data/noimage.png"} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${item.status >= FleaItemStatus.Trading ? "opacity-60 grayscale" : ""}`} />
                                                {item.status >= FleaItemStatus.Trading && (
                                                    <div className="absolute top-0 left-0 z-20">
                                                        <div className="w-0 h-0 border-t-[60px] border-t-red-600 border-r-[60px] border-r-transparent"></div>
                                                        <span className="absolute top-2 left-1 -rotate-45 text-white font-bold text-xs tracking-widest">SOLD</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <h3 className="text-sm font-medium text-gray-800 line-clamp-1 mb-1">{item.name}</h3>
                                                <p className="font-bold text-gray-900">¥{item.price.toLocaleString()}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                !listingLoading && <div className="text-center py-20 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">出品している商品はありません</div>
                            )}
                            {listingLoading && <div className="py-10 text-center text-gray-400">読み込み中...</div>}
                        </>
                    ) : (
                        <>
                            <div className="space-y-4">
                                {reviews.length > 0 ? (
                                    reviews.map((review, index) => (
                                        <div
                                            key={`${review.id}-${index}`}
                                            ref={index === reviews.length - 1 ? lastReviewRef : null}
                                            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100"
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <Avatar src={review.reviewerIconUrl} name={review.reviewerName} className="border" />
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{review.reviewerName}</p>
                                                    <div className="flex text-orange-400 text-xs">{"★".repeat(review.rating)}<span className="text-gray-200">{"★".repeat(5 - review.rating)}</span></div>
                                                </div>
                                                <span className="ml-auto text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            {review.itemName && <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded inline-block mb-2">購入商品: {review.itemName}</div>}
                                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50/50 p-3 rounded-lg">{review.comment || "コメントなし"}</p>
                                        </div>
                                    ))
                                ) : (
                                    !reviewLoading && <div className="text-center py-20 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">まだ評価はありません</div>
                                )}
                                {reviewLoading && <div className="py-10 text-center text-gray-400">読み込み中...</div>}
                            </div>
                        </>
                    )}
                </div>
            </main>

            <LoginModal isOpen={isLoginModalOpen} onClose={() => setLoginModalOpen(false)} onLoginSuccess={handleLoginSuccess} showCloseButton={true} />
            <ReportUserModal isOpen={isReportModalOpen} onClose={() => setReportModalOpen(false)} userName={profile.name} onSubmit={handleReportSubmit} />
        </div>
    );
};

export default UserProfile;