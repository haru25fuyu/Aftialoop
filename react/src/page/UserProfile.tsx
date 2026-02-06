import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import Header from "../component/Header";
import { Avatar } from "../component/Avatar";
import LoginModal from "../modal/Login";
import ReportUserModal from "../modal/ReportUserModal";

import api from "../conf/api";
import { CONFIG } from "../conf/config";
import { UserProfileData } from "../types/FleaMarket";
import { FleaItemStatus } from "../conf/FleaMarket";

import { MoreVertical, Flag, Ban } from "lucide-react";

const UserProfile: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"listings" | "reviews">("listings");

    // 自分のID (ログイン判定用)
    const [myUserId, setMyUserId] = useState<string | null>(null);

    // モーダルの表示状態管理
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    const [isReportModalOpen, setReportModalOpen] = useState(false);

    // メニューの表示状態管理
    const [showMenu, setShowMenu] = useState(false);

    // 自分の情報を取得する関数
    const fetchMe = () => {
        api.post('/customer', {})
            .then(res => {
                if (res.data.user) {
                    setMyUserId(res.data.user.id);
                }
            })
            .catch(() => setMyUserId(null));
    };

    // 初回ロード時に自分の情報を取得
    useEffect(() => {
        fetchMe();
    }, []);

    // プロフィール情報の取得
    useEffect(() => {
        if (!userId) return;
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/users/${userId}/profile`);
                setProfile(res.data);
            } catch (error) {
                console.error("Failed to fetch user profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [userId]);

    const handleLoginSuccess = () => {
        setLoginModalOpen(false);
        fetchMe();
    };

    const handleToggleFollow = async () => {
        if (!myUserId) {
            setLoginModalOpen(true);
            return;
        }
        if (!profile) return;

        const prevIsFollowing = profile.isFollowing;
        // const prevCount = profile.followersCount; // 使っていないので削除

        setProfile(prev => prev ? {
            ...prev,
            isFollowing: !prev.isFollowing,
            followersCount: prev.isFollowing ? prev.followersCount - 1 : prev.followersCount + 1
        } : null);

        try {
            if (prevIsFollowing) {
                await api.delete(`/sns/users/${userId}/follow`);
            } else {
                await api.post(`/sns/users/${userId}/follow`, {});
            }
        } catch (e) {
            console.error(e);
            setProfile(prev => prev ? {
                ...prev,
                isFollowing: prevIsFollowing,
                followersCount: prev.isFollowing ? prev.followersCount + 1 : prev.followersCount - 1
            } : null);
            alert("通信に失敗しました");
        }
    };

    const handleReportClick = () => {
        setShowMenu(false);
        if (!myUserId) {
            setLoginModalOpen(true);
            return;
        }
        setReportModalOpen(true);
    };

    const handleReportSubmit = async (reason: string, details: string) => {
        try {
            await api.post(`/sns/users/${userId}/report`, { reason, details });
            setReportModalOpen(false);
            alert("通報を受け付けました。ご協力ありがとうございます。");
        } catch (error) {
            console.error(error);
            alert("通報の送信に失敗しました。");
        }
    };

    const handleBlock = async () => {
        setShowMenu(false);
        if (!myUserId) {
            setLoginModalOpen(true);
            return;
        }
        if (!profile) return;

        if (window.confirm(`${profile.name}さんをブロックしますか？\nブロックすると、お互いにフォローができなくなり、商品の購入やコメントもできなくなります。`)) {
            try {
                await api.post(`/sns/users/${userId}/block`, {});
                setProfile(prev => prev ? { ...prev, isBlocked: true } : null); // ブロック状態を反映
                alert("ユーザーをブロックしました。");
            } catch (error) {
                console.error("Failed to block user", error);
                alert("ブロックに失敗しました。");
            }
        }
    };

    // ★ブロック解除処理
    const handleUnblock = async () => {
        if (!myUserId) return;
        if (!profile) return;

        if (window.confirm(`${profile.name}さんのブロックを解除しますか？`)) {
            try {
                await api.delete(`/sns/users/${profile.id}/block`);
                setProfile(prev => prev ? { ...prev, isBlocked: false } : null);
                alert("ブロックを解除しました。");
            } catch (error) {
                console.error("Failed to unblock", error);
                alert("解除に失敗しました。");
            }
        }
    };

    if (loading) return <div className="p-20 text-center text-gray-500">読み込み中...</div>;
    if (!profile) return <div className="p-20 text-center text-gray-500">ユーザーが見つかりません</div>;

    const isMe = String(myUserId) === String(profile.id);

    const listings = profile.listings || [];
    const reviews = profile.reviews || [];

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />

            <main className="w-full max-w-4xl mx-auto px-3 pt-4 md:px-4 md:pt-6">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6 relative">

                    {/* メニューボタン */}
                    {!isMe && (
                        <div className="absolute top-3 right-3 z-10">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <MoreVertical size={20} />
                            </button>

                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-20 cursor-default"
                                        onClick={() => setShowMenu(false)}
                                    ></div>
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                        <button
                                            onClick={handleReportClick}
                                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                        >
                                            <Flag size={16} className="text-gray-400" />
                                            通報する
                                        </button>
                                        <button
                                            onClick={handleBlock}
                                            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-gray-50"
                                        >
                                            <Ban size={16} className="text-red-500" />
                                            ブロックする
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* アバター */}
                    <div className="flex-shrink-0 mx-auto md:mx-0">
                        <Avatar
                            src={profile.iconUrl}
                            name={profile.name}
                            className="w-24 h-24 md:w-32 md:h-32 border-4 border-white shadow-md text-3xl md:text-5xl"
                        />
                    </div>

                    {/* プロフィール詳細 */}
                    <div className="flex-1 w-full space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 text-center md:text-left pr-8">
                                    {profile.name}
                                </h1>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <span className="text-orange-400">★</span>
                                        <span className="font-bold text-gray-900">{profile.ratingAverage.toFixed(1)}</span>
                                        <span className="text-xs">({profile.ratingCount})</span>
                                    </div>
                                    <div className="w-px h-3 bg-gray-300"></div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold text-gray-900">{profile.followersCount}</span>
                                        <span className="text-xs">フォロワー</span>
                                    </div>
                                    <div className="w-px h-3 bg-gray-300"></div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold text-gray-900">{profile.followingCount}</span>
                                        <span className="text-xs">フォロー中</span>
                                    </div>
                                </div>
                            </div>

                            {/* ボタンエリア */}
                            {!isMe && (
                                <div className="flex justify-center md:justify-end">
                                    {profile.isBlocked ? (
                                        <button
                                            onClick={handleUnblock}
                                            className="px-6 py-2 rounded-full font-bold transition-all shadow-sm border bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                        >
                                            ブロック中
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleToggleFollow}
                                            className={`px-6 py-2 rounded-full font-bold transition-all shadow-sm border ${profile.isFollowing
                                                ? "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                                                : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:shadow-md"
                                                }`}
                                        >
                                            {profile.isFollowing ? "フォロー中" : "フォローする"}
                                        </button>
                                    )}
                                </div>
                            )}
                            {isMe && (
                                <div className="flex justify-center md:justify-end">
                                    <Link to="/mypage/profile" className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-full hover:bg-gray-200">
                                        プロフィール編集
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {profile.description || "自己紹介文はまだ設定されていません。"}
                        </div>
                    </div>
                </div>

                {/* タブ切り替え */}
                <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl px-4 shadow-sm">
                    <button
                        className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === "listings"
                            ? "border-emerald-500 text-emerald-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                        onClick={() => setActiveTab("listings")}
                    >
                        出品商品 ({listings.length})
                    </button>
                    <button
                        className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === "reviews"
                            ? "border-emerald-500 text-emerald-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                        onClick={() => setActiveTab("reviews")}
                    >
                        評価一覧 ({reviews.length})
                    </button>
                </div>

                <div className="min-h-[300px]">
                    {activeTab === "listings" ? (
                        listings.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                                {listings.map((item) => (
                                    <Link
                                        key={item.id}
                                        to={`/flea-market/item/${item.id}`}
                                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
                                    >
                                        <div className="relative aspect-square bg-gray-100">
                                            <img
                                                src={item.main_image_url ? CONFIG.BASE_URL + item.main_image_url : "/data/noimage.png"}
                                                alt={item.name}
                                                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${item.status >= FleaItemStatus.Trading ? "opacity-60 grayscale" : ""}`}
                                            />
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
                            <div className="text-center py-20 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                                出品している商品はありません
                            </div>
                        )
                    ) : (
                        <div className="space-y-4">
                            {reviews.length > 0 ? (
                                reviews.map((review) => (
                                    <div key={review.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Avatar
                                                src={review.reviewerIconUrl}
                                                name={review.reviewerName}
                                                className="border"
                                            />
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{review.reviewerName}</p>
                                                <div className="flex text-orange-400 text-xs">
                                                    {"★".repeat(review.rating)}
                                                    <span className="text-gray-200">{"★".repeat(5 - review.rating)}</span>
                                                </div>
                                            </div>
                                            <span className="ml-auto text-xs text-gray-400">
                                                {new Date(review.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {review.itemName && (
                                            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded inline-block mb-2">
                                                購入商品: {review.itemName}
                                            </div>
                                        )}
                                        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50/50 p-3 rounded-lg">
                                            {review.comment || "コメントなし"}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                                    まだ評価はありません
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setLoginModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
                showCloseButton={true}
            />

            <ReportUserModal
                isOpen={isReportModalOpen}
                onClose={() => setReportModalOpen(false)}
                userName={profile.name}
                onSubmit={handleReportSubmit}
            />
        </div>
    );
};

export default UserProfile;