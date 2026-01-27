import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import Header from "../component/Header";

import api from "../conf/api";
import { CONFIG } from "../conf/config";

import { UserProfileData } from "../types/FleaMarket";
import { Avatar } from "../component/Avatar";



const UserProfile: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"listings" | "reviews">("listings");

    // 自分のIDを取得して、自分自身のプロフィールか判定する
    const [myUserId, setMyUserId] = useState<string | null>(null);

    useEffect(() => {
        // ログインユーザー情報の取得（簡易的）
        api.post('/customer', {}).then(res => setMyUserId(res.data.user.id));
    }, []);

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

    // ★フォロー切り替え処理
    const handleToggleFollow = async () => {
        if (!profile || !myUserId) {
            alert("ログインが必要です"); // またはログイン画面へ誘導
            return;
        }

        // 楽観的UI更新（API通信の完了を待たずに見た目を変える）
        const prevIsFollowing = profile.isFollowing;
        const prevCount = profile.followersCount;

        setProfile(prev => prev ? {
            ...prev,
            isFollowing: !prev.isFollowing,
            followersCount: prev.isFollowing ? prev.followersCount - 1 : prev.followersCount + 1
        } : null);

        try {
            if (prevIsFollowing) {
                // フォロー解除 (DELETE)
                await api.delete(`/users/${userId}/follow`);
            } else {
                // フォローする (POST)
                await api.post(`/users/${userId}/follow`, {});
            }
        } catch (e) {
            // 失敗したら元に戻す
            console.error(e);
            setProfile(prev => prev ? {
                ...prev,
                isFollowing: prevIsFollowing,
                followersCount: prevCount
            } : null);
            alert("通信に失敗しました");
        }
    };

    if (loading) return <div className="p-20 text-center text-gray-500">読み込み中...</div>;
    if (!profile) return <div className="p-20 text-center text-gray-500">ユーザーが見つかりません</div>;

    const isMe = String(myUserId) === String(profile.id);

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />

            <main className="w-full max-w-4xl mx-auto px-3 pt-4 md:px-4 md:pt-6">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="flex-shrink-0 mx-auto md:mx-0">
                        <Avatar
                            src={profile.iconUrl}
                            name={profile.name}
                            className="w-24 h-24 md:w-32 md:h-32 border-4 border-white shadow-md text-3xl md:text-5xl"
                        />
                    </div>

                    <div className="flex-1 w-full space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 text-center md:text-left">{profile.name}</h1>

                                {/* 評価・フォロワー数などのステータス行 */}
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

                            {/* ★フォローボタンエリア */}
                            {!isMe && (
                                <div className="flex justify-center md:justify-end">
                                    <button
                                        onClick={handleToggleFollow}
                                        className={`px-6 py-2 rounded-full font-bold transition-all shadow-sm border ${profile.isFollowing
                                            ? "bg-white text-gray-500 border-gray-300 hover:bg-gray-50" // フォロー中
                                            : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:shadow-md" // フォローする
                                            }`}
                                    >
                                        {profile.isFollowing ? "フォロー中" : "フォローする"}
                                    </button>
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

                {/* 2. タブ切り替え */}
                <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl px-4 shadow-sm">
                    <button
                        className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === "listings"
                            ? "border-emerald-500 text-emerald-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                        onClick={() => setActiveTab("listings")}
                    >
                        出品商品 ({profile.listings.length})
                    </button>
                    <button
                        className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === "reviews"
                            ? "border-emerald-500 text-emerald-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                        onClick={() => setActiveTab("reviews")}
                    >
                        評価一覧 ({profile.reviews.length})
                    </button>
                </div>

                {/* 3. コンテンツエリア */}
                <div className="min-h-[300px]">
                    {activeTab === "listings" ? (
                        /* --- 出品リスト --- */
                        profile.listings.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                                {profile.listings.map((item) => (
                                    <Link
                                        key={item.id}
                                        to={`/flea-market/item/${item.id}`}
                                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
                                    >
                                        <div className="relative aspect-square bg-gray-100">
                                            <img
                                                src={item.main_image_url ? CONFIG.BASE_URL + item.main_image_url : "/data/noimage.png"}
                                                alt={item.name}
                                                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${item.quantity <= 0 ? "opacity-60 grayscale" : ""}`}
                                            />
                                            {item.quantity <= 0 && (
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
                        /* --- レビューリスト --- */
                        <div className="space-y-4">
                            {profile.reviews.length > 0 ? (
                                profile.reviews.map((review) => (
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
        </div>
    );
};

export default UserProfile;