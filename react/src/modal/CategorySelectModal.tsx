import React, { useEffect, useState } from "react";
import api from "../conf/api";
import { CategorySearchResult } from "../types/FleaMarketForm";

type CategoryNode = {
    id: number;
    name: string;
    built_in_type: string;
    // 用品の場合は supply_type_id などの情報が必要
};

type Props = {
    open: boolean;
    onClose: () => void;
    onSelect: (category: CategorySearchResult) => void;
    searchType: 'ANIMAL' | 'SUPPLY'; // ★親の選択状態を受け取る
};

export default function CategorySelectModal({ open, onClose, onSelect, searchType }: Props) {
    const [history, setHistory] = useState<CategoryNode[]>([]);
    const [currentList, setCurrentList] = useState<any[]>([]); // カテゴリまたは用品
    const [loading, setLoading] = useState(false);

    const currentParent = history.length > 0 ? history[history.length - 1] : null;

    const fetchData = async (parentId: number | null) => {
        setLoading(true);
        try {
            let url = "";
            // ★用品モードかつトップ階層なら、直接用品種別を取得しに行く
            if (searchType === 'SUPPLY' && !parentId) {
                url = "/api/supply-types";
            } else {
                url = parentId 
                    ? `/api/categories/children?parent_id=${parentId}` 
                    : `/api/categories/children`;
            }

            const res = await api.get(url);
            setCurrentList(res.data || []);
            return res.data && res.data.length > 0;
        } catch (e) {
            console.error(e);
            return false;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            setHistory([]);
            fetchData(null);
        }
    }, [open, searchType]); // searchTypeが変わったらリロード

    const handleItemClick = async (item: any) => {
        // 用品モードのトップ階層（用品種別を選んだ）の場合
        if (searchType === 'SUPPLY' && !currentParent) {
            // 次に対象となる動物（カテゴリー）を選ばせる
            setHistory([...history, item]);
            fetchData(null); // ルートカテゴリー（犬、猫など）を取得
            return;
        }

        // 通常のカテゴリードリルダウン
        const hasChildren = await fetchData(item.id);
        if (hasChildren) {
            setHistory([...history, item]);
        } else {
            confirmSelection(item);
        }
    };

    const confirmSelection = (item: any) => {
        let result: CategorySearchResult;

        if (searchType === 'SUPPLY') {
            // 用品の場合：history[0]が用品種別、itemが動物カテゴリー
            const supplyType = history[0];
            result = {
                id: item.id, // カテゴリーID（犬など）
                name: `${item.name} > ${supplyType.name}`,
                built_in_type: item.built_in_type,
                supply_type_id: supplyType.id, // 用品ID（フードなど）
            };
        } else {
            // 生体の場合
            result = {
                id: item.id,
                name: item.name,
                built_in_type: item.built_in_type,
            };
        }

        onSelect(result);
        onClose();
    };

    const handleBack = () => {
        const nextHistory = history.slice(0, -1);
        setHistory(nextHistory);
        fetchData(nextHistory.length > 0 ? nextHistory[nextHistory.length - 1].id : null);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                
                {/* ヘッダー */}
                <div className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {history.length > 0 && (
                            <button onClick={handleBack} className="text-blue-600 text-sm">← 戻る</button>
                        )}
                        <h3 className="font-bold text-gray-800">
                            {searchType === 'ANIMAL' ? '生体カテゴリー' : '用品カテゴリー'}を選択
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
                </div>

                {/* 状態表示 */}
                {history.length > 0 && (
                    <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 border-b">
                        選択中: {history.map(h => h.name).join(" > ")}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">読み込み中...</div>
                    ) : (
                        <ul className="space-y-1">
                            {currentList.map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleItemClick(item)}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-lg flex justify-between items-center group transition-colors"
                                    >
                                        <span className="font-medium text-gray-700">{item.name}</span>
                                        <span className="text-gray-300">＞</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* 決定ボタン（生体かつ途中階層で止めたい場合） */}
                {searchType === 'ANIMAL' && history.length > 0 && (
                    <div className="p-4 border-t bg-gray-50">
                        <button
                            onClick={() => currentParent && confirmSelection(currentParent)}
                            className="w-full py-3 bg-green-600 text-white font-bold rounded-lg"
                        >
                            「{currentParent?.name}」として決定
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}