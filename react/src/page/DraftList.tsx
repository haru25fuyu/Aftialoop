import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Edit2, Trash2, ImageOff, Clock, FileText, ChevronLeft } from "lucide-react";
import { Header } from "../component/Header";
import api from "../conf/api";
import { DraftItem } from "../types/FleaMarket";
import { CONFIG } from "../conf/config";

export default function DraftListPage() {
    const navigate = useNavigate();
    const [drafts, setDrafts] = useState<DraftItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDrafts = () => {
        setLoading(true);
        api.get("/flea-market/draft/list?limit=20&offset=0")
            .then((res) => {
                setDrafts(res.data.items || []);
                console.log(res.data);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchDrafts();
    }, []);

    const handleDelete = async (id: number) => {
        if (!window.confirm("この下書きを削除しますか？")) return;
        try {
            await api.delete(`/flea-market/draft/${id}`);
            setDrafts((prev) => prev.filter((d) => d.draft_id !== id));
        } catch (error) {
            console.error(error);
            alert("削除に失敗しました");
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />
            <div className="max-w-2xl mx-auto p-4 space-y-6">
                <div className="flex items-center gap-2 mt-4">
                    <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full">
                        <ChevronLeft size={24} className="text-gray-600" />
                    </button>
                    <FileText className="text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-800">下書き一覧</h1>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-gray-400">読み込み中...</div>
                ) : drafts.length === 0 ? (
                    <div className="p-10 text-center bg-white rounded-xl border border-gray-200 text-gray-500 shadow-sm">
                        下書きはありません
                    </div>
                ) : (
                    <div className="space-y-4">
                        {drafts.map((draft) => (
                            <div key={draft.draft_id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-4">
                                {/* 画像サムネイル */}
                                <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                                    {draft.main_image_url ? (
                                        <img src={CONFIG.BASE_URL + draft.main_image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageOff className="text-gray-300" size={24} />
                                    )}
                                </div>

                                {/* 詳細情報 */}
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-800 line-clamp-1">
                                            {draft.name || "タイトル未設定"}
                                        </h3>
                                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                            <Clock size={12} />
                                            <span>編集: {new Date(draft.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="text-sm font-bold text-gray-600">
                                        {draft.price ? `¥${Number(draft.price).toLocaleString()}` : "価格未定"}
                                    </div>
                                </div>

                                {/* 操作ボタン */}
                                <div className="flex flex-col justify-center gap-2 border-l border-gray-100 pl-4">
                                    <Link
                                        to={`/flea-market/sell/create/${draft.draft_id}`}
                                        className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition"
                                    >
                                        <Edit2 size={16} /> 編集
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(draft.draft_id)}
                                        className="flex items-center gap-1 text-sm font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition"
                                    >
                                        <Trash2 size={16} /> 削除
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}