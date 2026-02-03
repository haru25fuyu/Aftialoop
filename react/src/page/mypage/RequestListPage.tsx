import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ClipboardCheck, Package } from "lucide-react";
import { Header } from "../../component/Header"; // ヘッダーは共通
import api from "../../conf/api";
import { CONFIG } from "../../conf/config";

// 申請データの型（APIのレスポンスに合わせて調整してください）
interface PurchaseRequestItem {
    id: number;
    item_id: number;
    item_name: string;
    item_main_image_url: string;
    buyer_name: string;
    created_at: string;
    status: string;
}

export default function RequestListPage() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<PurchaseRequestItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ★API実装想定: /mypage/requests
        // seller_id = 自分, status = 'REQUESTED' の一覧を取得するエンドポイント
        api.get("/mypage/requests")
            .then((res) => {
                setRequests(res.data || []);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <>
            <Header />
            <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
                {/* ページヘッダー */}
                <div className="bg-white p-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-10">
                    <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full">
                        <ChevronLeft size={24} className="text-gray-600" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-800">購入申請</h1>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-gray-400">読み込み中...</div>
                ) : requests.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center gap-4 mt-10">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                            <ClipboardCheck size={32} />
                        </div>
                        <p className="text-gray-500 font-bold">現在、購入申請はありません</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        <p className="text-xs text-gray-500 ml-1">
                            あなたの商品を購入したいユーザーがいます。<br />
                            内容を確認して承認・拒否を選択してください。
                        </p>

                        {requests.map((req) => (
                            <Link
                                key={req.id}
                                to={`/flea-market/transactions/${req.id}`} // 詳細ページへ (未実装なら作る)
                                className="block bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition active:scale-[0.99]"
                            >
                                <div className="flex gap-4">
                                    {/* 商品画像 */}
                                    <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                                        {req.item_main_image_url ? (
                                            <img
                                                src={req.item_main_image_url.startsWith("http") ? req.item_main_image_url : CONFIG.BASE_URL + req.item_main_image_url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <Package size={24} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-sm line-clamp-2 leading-relaxed">
                                                {req.item_name}
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-1">
                                                申請者: {req.buyer_name || "ユーザー"}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-gray-400">
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                                                承認待ち
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}