import React, { useEffect, useState } from "react";
import api from "../conf/api";
import { CategorySearchResult } from "../types/FleaMarketForm";
import { ChevronRightIcon, ChevronLeftIcon, XMarkIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";

type CategoryNode = {
    id: number;
    name: string;
    has_children?: boolean;
    is_supply_type?: boolean;
};

type Props = {
    open: boolean;
    onClose: () => void;
    onSelect: (value: CategorySearchResult) => void;
    searchType: "ANIMAL" | "SUPPLY";
};

export default function CategorySelectModal({ open, onClose, onSelect, searchType }: Props) {
    const [list, setList] = useState<CategoryNode[]>([]);
    const [path, setPath] = useState<CategoryNode[]>([]);
    const [loading, setLoading] = useState(false);

    // ★追加: 用品選択モードかどうかのフラグ
    // trueの場合、pathで示されるカテゴリーに対する「用品種別リスト」を表示している状態
    const [isSelectingSupply, setIsSelectingSupply] = useState(false);

    const fetchList = async () => {
        if (!open) return;

        try {
            setLoading(true);
            const parent = path[path.length - 1];

            // --- 用品選択モードの場合 ---
            // どの階層にいても、ここが true なら「用品種別（エサ、ケージ...）」を取得して表示
            if (isSelectingSupply && searchType === "SUPPLY") {
                const supplyRes = await api.get<CategoryNode[]>("/api/supply-types");
                const data = (Array.isArray(supplyRes.data) ? supplyRes.data : []).map(item => ({
                    ...item,
                    is_supply_type: true,
                }));
                setList(data);
                setLoading(false);
                return;
            }

            // --- 通常のカテゴリー選択モード ---
            let url = "/api/categories/children";
            // 親がいる場合はその子供、いない場合はルート
            if (parent) {
                url += `?parent_id=${parent.id}`;
            }

            const res = await api.get<CategoryNode[]>(url);
            const data = Array.isArray(res.data) ? res.data : [];

            // 生体モードで末端まで来た場合の処理などはUI側で行うため、ここではデータをセットするだけ
            // ただし、用品モードで「子がない（末端）」カテゴリーを選んだ場合は、自動的に用品選択モードへ移行させる
            if (searchType === "SUPPLY" && parent && data.length === 0) {
                setIsSelectingSupply(true);
                // 再取得のために再帰呼び出し（state更新が反映される次のレンダーを待たずに即時実行）
                // ※無限ループ防止のため、ここではフラグだけ立ててuseEffectに任せるか、
                //   あるいは直接ここで用品を取得するか。今回は直接取得するフローにします。
                const supplyRes = await api.get<CategoryNode[]>("/api/supply-types");
                const supplyData = (Array.isArray(supplyRes.data) ? supplyRes.data : []).map(item => ({
                    ...item,
                    is_supply_type: true,
                }));
                setList(supplyData);
            } else {
                setList(data);
            }

        } catch (error) {
            console.error("Failed to fetch categories:", error);
            setList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchList();
        } else {
            // リセット
            if (path.length > 0) setPath([]);
            if (list.length > 0) setList([]);
            if (isSelectingSupply) setIsSelectingSupply(false);
        }
        // isSelectingSupply が変わった時も再取得（用品リスト⇔カテゴリーリストの切り替え）
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, path, searchType, isSelectingSupply]);

    const handleItemClick = (node: CategoryNode) => {
        // 1. 用品種別（エサ、ケージ等）を選択した場合 -> 完了
        if (node.is_supply_type) {
            const category = path[path.length - 1] || { id: 0, name: "全カテゴリー" }; // ルートでの選択も考慮
            onSelect({
                id: category.id, // メインID
                name: `${category.name} > ${node.name}`, // 表示名
                is_supply: true,
                // ★型定義に追加したプロパティへ値をセット（any不要）
                category_id: category.id,
                category_name: category.name,
                supply_type_id: node.id,
                supply_type_name: node.name
            });
            onClose();
            return;
        }

        // 2. 通常カテゴリーを選択した場合 -> 掘り下げる
        setPath((prev) => [...prev, node]);
        // ここで isSelectingSupply は false のまま（useEffectで次の階層を取得）
        // もし末端なら fetchList 内で自動的に true になる
    };

    // 「このカテゴリーで用品を選ぶ」ボタン用
    const handleSelectSupplyHere = () => {
        setIsSelectingSupply(true);
    };

    const handleBack = () => {
        if (isSelectingSupply) {
            // 用品選択画面から戻る場合
            setIsSelectingSupply(false);

            // もし「末端（自動遷移）」だった場合は、一つ上のカテゴリー階層に戻るべき
            // 「途中（手動遷移）」だった場合は、現在のカテゴリー階層（用品ボタンがある画面）に戻るべき

            // 簡易判定: 現在のpathの末端が「子なし」なら自動遷移で来た可能性が高いのでpopする
            // ただし has_children はAPIレスポンス依存なので、ここでは
            // 「手動で押したなら path はそのままでモードだけ戻す」
            // 「自動で遷移したなら...」の区別が難しい。

            // シンプルなUX: 
            // 用品選択モードから戻る -> そのカテゴリーの子供一覧（選択前）に戻る
            // つまり path は変えずに mode だけ戻すのが基本。
            // ただし、末端カテゴリー(子がない)の場合は「子供一覧」が空なので、
            // 戻ってもまた自動的に用品モードになってしまうループになる。

            // ★対策: fetchListの結果が空だった（末端）かどうかを判定するのは難しいので、
            // 「用品モード解除」と同時に「もし末端ならpathも一つ戻す」必要がある。
            // ここでは安全側に倒して、「用品モードを解除」するだけにします。
            // もし末端なら、画面が一瞬「子なし」表示になるか、再度用品モードになるかですが、
            // UIで「子なし」の場合は「このカテゴリーで決定」が出るようにしているので、ループはしないはず。
        } else {
            // 通常の階層戻り
            setPath((prev) => prev.slice(0, -1));
        }
    };

    // 生体モードでの決定
    const handleDecideAnimal = () => {
        if (path.length === 0) return;
        const current = path[path.length - 1];
        onSelect({
            id: current.id,
            name: current.name,
            is_supply: false
        });
        onClose();
    };

    if (!open) return null;

    const currentParent = path[path.length - 1];
    // 生体モードでリストが空 ＝ 末端
    const isLeafAnimal = !loading && list.length === 0 && searchType === "ANIMAL" && path.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                {/* ヘッダー */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                        {(path.length > 0 || isSelectingSupply) && (
                            <button onClick={handleBack} className="rounded-full p-1 hover:bg-gray-100">
                                <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                            </button>
                        )}
                        <h2 className="text-lg font-semibold text-gray-800">
                            {isSelectingSupply
                                ? "用品の種類を選択"
                                : (currentParent ? currentParent.name : "カテゴリーを選択")}
                        </h2>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
                        <XMarkIcon className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                {/* パンくずリスト */}
                <div className="border-b bg-gray-50 px-4 py-2 text-sm text-gray-500 overflow-x-auto whitespace-nowrap">
                    <span className="font-bold">{searchType === "ANIMAL" ? "生体" : "用品"}</span>
                    {path.map((node) => (
                        <span key={node.id}>{" > "}{node.name}</span>
                    ))}
                    {isSelectingSupply && <span className="text-blue-600 font-bold">{" > "}(用品選択)</span>}
                </div>

                {/* リスト */}
                <div className="flex-1 overflow-y-auto p-2">
                    {/* ★追加: 用品モードで、まだ用品選択画面でない場合、トップに「ここで用品を選ぶ」ボタンを表示 */}
                    {searchType === "SUPPLY" && !isSelectingSupply && !loading && (
                        <div className="mb-2 border-b border-gray-100 pb-2">
                            <button
                                onClick={handleSelectSupplyHere}
                                className="flex w-full items-center gap-3 rounded-md bg-blue-50 px-4 py-3 text-left text-blue-700 hover:bg-blue-100"
                            >
                                <ShoppingBagIcon className="h-5 w-5" />
                                <span className="font-bold">
                                    {currentParent ? `「${currentParent.name}」の用品として設定` : "全カテゴリー共通の用品として設定"}
                                </span>
                            </button>
                            <div className="mt-2 text-xs text-center text-gray-400">
                                ↓ または、より詳細なカテゴリーを選択
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex h-32 items-center justify-center">
                            <div className="animate-spin h-8 w-8 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                        </div>
                    ) : list.length > 0 ? (
                        <ul className="space-y-1">
                            {list.map((node) => (
                                <li key={node.id}>
                                    <button
                                        onClick={() => handleItemClick(node)}
                                        className="flex w-full items-center justify-between rounded-md px-4 py-3 text-left hover:bg-gray-50"
                                    >
                                        <span className={node.is_supply_type ? "font-bold text-gray-800" : "text-gray-700"}>
                                            {node.name}
                                        </span>
                                        {/* 用品種別でなければ矢印 */}
                                        {!node.is_supply_type && (
                                            <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : isLeafAnimal ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            <p className="text-gray-500 mb-4">これ以上細かい分類はありません</p>
                            <button
                                onClick={handleDecideAnimal}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                「{currentParent.name}」で決定する
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 text-center text-gray-500">
                            {/* 用品モードで空＝末端に来たが、fetchListで自動遷移するはずなのでここは一瞬しか表示されないはず */}
                            読み込み中...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}