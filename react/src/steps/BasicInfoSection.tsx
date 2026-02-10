import React, { useState } from "react";
import AutocompleteInput from "../component/AutocompleteInput";
import { CATEGORY_OPTIONS } from "../conf/Market";
import { ItemType } from "../types/Market";
import { FormState, FormSetters,CategorySearchResult } from "../types/FleaMarketForm";
import CategorySelectModal from "../modal/CategorySelectModal";

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
    // ★ここ重要: category_id, category_name (スネークケース) で受け取る
    const { name, type, categoryId, categoryName, supplyDetails, description } = formState;
    const { setName, setType, setSupplyDetails, setDescription } = setters;

    // モーダルの開閉管理
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);

    // 現在のタイプに対応するオプション
    const currentCategoryOption = CATEGORY_OPTIONS.find(opt => opt.value === type);

    // デバッグ用: 値が来ているか確認
    console.log("BasicInfoSection Render:", { categoryId, categoryName });

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

                            {/* ★ category_id があれば青いボックスを表示 */}
                            {categoryId ? (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                                    <div>
                                        <span className="text-xs text-blue-500 font-bold block mb-1">
                                            選択中 ({currentCategoryOption?.label})
                                        </span>
                                        <div className="font-bold text-gray-800 flex items-center gap-2">
                                            <span>{currentCategoryOption?.icon || "🪲"}</span>
                                            {/* ★ category_name を表示 */}
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
                                    <span className="text-gray-400 block mb-2">カテゴリーが未設定です</span>
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

                    {/* カテゴリー手動変更 (デバッグ用にも便利) */}
                    <div className="mt-3 flex justify-end items-center gap-2">
                        <span className="text-xs text-gray-400">大分類:</span>
                        <select
                            className="text-xs border-gray-300 rounded shadow-sm focus:border-blue-300"
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
            </div>

            {/* モーダル */}
            <CategorySelectModal
                open={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                onSelect={(item) => {
                    // console.log("Modal Selected:", item); // デバッグ用
                    onCategorySelect(item);
                    setCategoryModalOpen(false); // ★選択したら閉じる
                }}
            />
        </section >
    );
}