import React, { useEffect, useState } from "react";
import api from "../conf/api";
import { CategorySearchResult } from "../types/FleaMarketForm";

// カテゴリーの型（APIレスポンス用）
type CategoryNode = {
    id: number;
    name: string;
    rank: string;
    has_children?: boolean;
    built_in_type: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
    onSelect: (category: CategorySearchResult) => void;
};

export default function CategorySelectModal({ open, onClose, onSelect }: Props) {
    const [history, setHistory] = useState<CategoryNode[]>([]); // パンくず用
    const [currentList, setCurrentList] = useState<CategoryNode[]>([]);
    const [loading, setLoading] = useState(false);

    // 現在の親ID（historyの最後）
    const currentParent = history.length > 0 ? history[history.length - 1] : null;

    // カテゴリー読み込み
    const fetchChildren = async (parentId: number | null) => {
        setLoading(true);
        try {
            // 親ID指定、なければルート
            const url = parentId
                ? `/api/categories/children?parent_id=${parentId}`
                : `/api/categories/children`; // ルート取得

            const res = await api.get(url);

            // データが空なら「行き止まり（葉ノード）」の可能性が高い
            if (!res.data || res.data.length === 0) {
                // そのまま選択扱いにしてもいいし、アラート出してもいい
                return false;
            }
            setCurrentList(res.data);
            return true;
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // 初期表示
    useEffect(() => {
        if (open) {
            setHistory([]); // リセット
            fetchChildren(null); // ルート取得
        }
    }, [open]);

    // リスト項目タップ時
    const handleItemClick = async (item: CategoryNode) => {
        // 次の階層があるか確認
        const hasChildren = await fetchChildren(item.id);

        if (hasChildren) {
            // 子供がいれば掘り下げる
            setHistory([...history, item]);
        } else {
            // 子供がいなければ、それを選択して終了
            confirmSelection(item);
        }
    };

    // 「この階層で決定する」ボタン（種名まで詳しくわからない時用）
    const handleSelectCurrent = () => {
        if (currentParent) {
            confirmSelection(currentParent);
        }
    };

    const confirmSelection = (item: CategoryNode) => {
        // 呼び出し元に返すデータを作成
        // historyを使ってパンくず名を作るなどしても良い
        //const fullPathName = [...history, item].map(n => n.name).join(" > ");

        const result: CategorySearchResult = {
            id: item.id,
            name: item.name,
            built_in_type: item.built_in_type,
        };

        onSelect(result);
        onClose();
    };

    // パンくずタップで戻る
    const handleBreadcrumbClick = (index: number) => {
        // 指定したインデックスまでの履歴を残す
        const nextHistory = history.slice(0, index + 1);
        const targetItem = nextHistory[nextHistory.length - 1];
        setHistory(nextHistory);
        fetchChildren(targetItem.id);
    };

    // 「トップ」に戻る
    const handleReset = () => {
        setHistory([]);
        fetchChildren(null);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* ヘッダー */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h3 className="font-bold text-gray-800">カテゴリーを選択</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>

                {/* パンくずリスト */}
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center flex-wrap gap-1 text-sm">
                    <button onClick={handleReset} className={`hover:underline ${history.length === 0 ? "font-bold text-gray-800" : "text-blue-600"}`}>
                        トップ
                    </button>
                    {history.map((node, i) => (
                        <React.Fragment key={node.id}>
                            <span className="text-gray-400">/</span>
                            <button
                                onClick={() => i === history.length - 1 ? {} : handleBreadcrumbClick(i)}
                                className={`hover:underline ${i === history.length - 1 ? "font-bold text-gray-800 cursor-default" : "text-blue-600"}`}
                            >
                                {node.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                {/* リスト表示エリア */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center p-8"><span className="loading-spinner text-blue-500">読み込み中...</span></div>
                    ) : (
                        <ul className="space-y-1">
                            {currentList.map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleItemClick(item)}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-lg flex justify-between items-center group transition-colors"
                                    >
                                        <span className="font-medium text-gray-700 group-hover:text-blue-700">{item.name}</span>
                                        <span className="text-gray-300 text-xs">＞</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!loading && currentList.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            項目がありません
                        </div>
                    )}
                </div>

                {/* フッター：現在の階層で決定する */}
                {history.length > 0 && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                        <div className="text-xs text-gray-500 mb-2 text-center">
                            探している品種がない場合は、現在の分類で登録できます
                        </div>
                        <button
                            onClick={handleSelectCurrent}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-all active:scale-95"
                        >
                            「{currentParent?.name}」として決定
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}