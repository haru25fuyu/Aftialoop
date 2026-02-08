import React from "react";
import AutocompleteInput from "../component/AutocompleteInput";
import { CATEGORY_OPTIONS } from "../conf/Market";
import { ItemType } from "../types/Market";
import { FormState, FormSetters, CategorySearchResult } from "../types/FleaMarketForm";
import CategorySelectModal from "../modal/CategorySelectModal";

// 共通スタイル
const inputClass = "w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition-colors";
const labelClass = "block mb-2 text-sm font-bold text-gray-700";

type BasicInfoSectionProps = {
    formState: FormState;
    setters: FormSetters;
    errors: Record<string, string>;
    onCategorySelect: (item: CategorySearchResult) => void;
    supplyTypes: { id: number; name: string }[];
};

export function BasicInfoSection({ formState, setters, errors, onCategorySelect, supplyTypes }: BasicInfoSectionProps) {
    const { name, type, liveDetails, supplyDetails, description, quantity, isMultiPurchasable } = formState;
    const { setName, setType, setSupplyDetails, setDescription, setQuantity, setIsMultiPurchasable } = setters;
    const [categoryModalOpen, setCategoryModalOpen] = React.useState(false);

    // 現在のタイプに対応するオプション情報
    const currentCategoryOption = CATEGORY_OPTIONS.find(opt => opt.value === type);

    return (
        <section className="bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">基本情報</h2>

            <div className="space-y-6">
                {/* 1. 商品名 */}
                <div>
                    <label className={labelClass}>商品名 <span className="text-red-500">*</span></label>
                    <AutocompleteInput
                        className={inputClass}
                        value={name}
                        onChange={setName}
                        onSelect={onCategorySelect}
                        placeholder="商品名（必須 40文字まで）"
                        error={errors.name}
                    />
                </div>

                {/* 2. カテゴリー表示エリア */}
                <div>
                    {type !== "SUPPLY" ? (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className={labelClass}>品種・分類</label>
                            {liveDetails.category_id ? (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                                    <div>
                                        <span className="text-xs text-blue-500 font-bold block mb-1">
                                            選択中 ({currentCategoryOption?.label})
                                        </span>
                                        <div className="font-bold text-gray-800 flex items-center gap-2">
                                            <span>{currentCategoryOption?.icon || "🪲"}</span>
                                            {liveDetails.category_name || "名称不明"}
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
                                    商品名を入力すると自動設定されます<br />
                                    <button
                                        type="button"
                                        onClick={() => setCategoryModalOpen(true)}
                                        className="text-blue-600 font-bold hover:underline mt-1"
                                    >
                                        一覧から選択する
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // 用品の場合
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className={labelClass}>用品の種類 <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <select
                                    className={`${inputClass} appearance-none cursor-pointer bg-white`}
                                    value={supplyDetails.supply_type_id || ""}
                                    onChange={(e) => setSupplyDetails({ ...supplyDetails, supply_type_id: Number(e.target.value) })}
                                >
                                    <option value="">選択してください</option>
                                    {supplyTypes.map((st) => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* カテゴリー手動変更 */}
                    <div className="mt-3 flex justify-end items-center gap-2">
                        <span className="text-xs text-gray-400">カテゴリー手動設定:</span>
                        <select
                            className="text-xs border-gray-300 rounded shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            value={type}
                            onChange={(e) => setType(e.target.value as ItemType)}
                        >
                            {CATEGORY_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.icon} {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
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

                {/* 4. 数量・オプション */}
                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-6">
                    <div /> {/* 左側スペース埋め（必要なら何か入れる） */}
                    <div>
                        <label className={labelClass}>数量</label>
                        <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden h-[50px]">
                            <button className="w-10 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 border-r" onClick={() => setQuantity((q: number) => Math.max(1, q - 1))}>－</button>
                            <div className="flex-1 text-center font-bold text-lg">{isMultiPurchasable ? quantity : 1}</div>
                            <button className="w-10 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 border-l disabled:opacity-50" onClick={() => setQuantity((q: number) => q + 1)} disabled={!isMultiPurchasable}>＋</button>
                        </div>
                        <label className="flex items-center gap-2 mt-2 text-xs text-gray-600 justify-end cursor-pointer">
                            <input type="checkbox" className="rounded text-blue-600" checked={isMultiPurchasable} onChange={(e) => setIsMultiPurchasable(e.target.checked)} />
                            複数購入可
                        </label>
                    </div>
                </div>
            </div>
            {/* モーダルの配置 */}
            <CategorySelectModal
                open={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                onSelect={(item) => {                    
                    onCategorySelect(item);
                }}        
            />
        </section >
    );
}