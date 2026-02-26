import { useState, useEffect } from "react";
import AutocompleteInput from "../component/AutocompleteInput";
import { CATEGORY_OPTIONS } from "../conf/Market";
import { ItemType } from "../types/Market";
import { FormState, FormSetters, CategorySearchResult } from "../types/FleaMarketForm";
import CategorySelectModal from "../modal/CategorySelectModal";

const inputClass = "w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition-colors";
const labelClass = "block mb-2 text-sm font-bold text-gray-700";

type BasicInfoSectionProps = {
    formState: FormState;
    setters: FormSetters;
    errors: Record<string, string>;
    onCategorySelect: (item: CategorySearchResult) => void;
};

export function BasicInfoSection({ formState, setters, errors, onCategorySelect }: BasicInfoSectionProps) {
    const { name, type, categoryId, categoryName, description, supplyTypeId } = formState;
    const { setName, setType, setDescription } = setters;

    // ★ 検索モード（生体 or 用品）の管理
    const [searchType, setSearchType] = useState<"ANIMAL" | "SUPPLY">("ANIMAL");

    // 編集モードなどで初期値が入っている場合の同期
    useEffect(() => {
        if (type === 'SUPPLY') {
            setSearchType('SUPPLY');
        } else {
            setSearchType('ANIMAL');
        }
    }, [type]);

    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [suggestedCategory, setSuggestedCategory] = useState<CategorySearchResult | null>(null);

    const currentCategoryOption = CATEGORY_OPTIONS.find(opt => opt.value === type);

    const applySuggestion = () => {
        if (suggestedCategory) {
            handleSelect(suggestedCategory);
            setSuggestedCategory(null);
        }
    };

    const handleSelect = (item: CategorySearchResult) => {
        // 親コンポーネントの関数を呼ぶ
        onCategorySelect(item);

        // ローカルのモードも同期
        if (item.is_supply || item.type === 'supply') {
            setSearchType('SUPPLY');
            setType('SUPPLY');
        } else {
            setSearchType('ANIMAL');
            if (item.built_in_type) {
                setType((item.built_in_type as ItemType) || 'INSECT');
            }
        }
    };

    return (
        <section className="bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">基本情報</h2>

            {/* 生体・用品 切り替えスイッチ */}
            <div className="flex p-1 mb-4 bg-gray-100 rounded-lg">
                <button
                    type="button"
                    onClick={() => { setSearchType("ANIMAL"); if (type === 'SUPPLY') setType("INSECT"); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all duration-200 ${searchType === "ANIMAL" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                    生体
                </button>
                <button
                    type="button"
                    onClick={() => { setSearchType("SUPPLY"); setType("SUPPLY"); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all duration-200 ${searchType === "SUPPLY" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                    用品
                </button>
            </div>

            <div className="space-y-6">
                {/* 1. 商品名 (オートコンプリート) */}
                <div>
                    <label className={labelClass}>商品名 <span className="text-red-500">*</span></label>
                    <AutocompleteInput
                        value={name}
                        onChange={setName}
                        type={searchType} // "ANIMAL" | "SUPPLY" を渡す
                        shouldReplaceValue={false}
                        onSelect={handleSelect}
                        placeholder={searchType === "ANIMAL" ? "例: オオクワガタ 能勢YG" : "例: プロゼリー 16g"}
                        error={errors.name}
                    />

                    {/* 提案エリア */}
                    {suggestedCategory && !categoryId && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                            <button
                                type="button"
                                onClick={applySuggestion}
                                className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors w-full md:w-auto"
                            >
                                <span className="text-lg">💡</span>
                                <span className="font-bold">カテゴリーを「{suggestedCategory.name}」に設定</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. カテゴリー表示エリア */}
                <div>
                    <label className={labelClass}>
                        {searchType === "ANIMAL" ? "品種・分類" : "用品カテゴリー"}
                    </label>

                    {(categoryId || supplyTypeId) ? (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                            <div>
                                <span className="text-xs text-blue-500 font-bold block mb-1">
                                    選択中 ({supplyTypeId ? "用品" : (currentCategoryOption?.label || "生体")})
                                </span>
                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                    <span>{supplyTypeId ? "📦" : (currentCategoryOption?.icon || "🪲")}</span>
                                    {categoryName || "名称不明"}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="text-xs text-gray-500 underline hover:text-blue-600"
                                onClick={() => setCategoryModalOpen(true)}
                            >
                                変更
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 bg-gray-50 border border-gray-200 border-dashed rounded-lg text-center text-sm text-gray-500">
                            <span className="text-gray-400 block mb-2">
                                {searchType === "ANIMAL" ? "生体の種類を選択してください" : "用品のカテゴリーを選択してください"}
                            </span>
                            <button
                                type="button"
                                onClick={() => setCategoryModalOpen(true)}
                                className="text-blue-600 font-bold hover:underline"
                            >
                                一覧から選択する
                            </button>
                        </div>
                    )}
                </div>

                {/* 3. 説明文 */}
                <div>
                    <label className={labelClass}>商品の説明 <span className="text-red-500">*</span></label>
                    <textarea
                        className={`${inputClass} min-h-[150px] resize-none`}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="商品の色、状態、特徴などを記載しましょう"
                    />
                    {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                </div>
            </div>

            {/* モーダル */}
            <CategorySelectModal
                open={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                onSelect={(item) => {
                    handleSelect(item);
                    setCategoryModalOpen(false);
                }}
                searchType={searchType} // ここで "ANIMAL" か "SUPPLY" を渡す
            />
        </section >
    );
}