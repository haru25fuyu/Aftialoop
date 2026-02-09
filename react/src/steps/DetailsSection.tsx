import React from "react";
import { CATEGORY_OPTIONS } from "../conf/Market";
import { ItemType } from "../types/Market";
import { LiveDetails, SupplyDetails, SexType } from "../types/FleaMarketForm";

const inputClass = "w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition-colors";
const labelClass = "block mb-2 text-sm font-bold text-gray-700";

// ★ラベル定義 (ConfirmDialogと同じ構造)
// null の項目は入力欄自体を表示しません
const FIELD_LABELS: Record<string, {
    locality: string;
    date: string;
    size: string;
    generation: string | null; // nullなら非表示
    sex: boolean;              // trueなら表示
}> = {
    INSECT: { locality: "産地", date: "羽化日", size: "サイズ", generation: "累代", sex: true },
    REPTILE: { locality: "モルフ / 産地", date: "生年月日", size: "全長 / 体重", generation: "血統 / 品種", sex: true },
    AMPHIBIAN: { locality: "モルフ / 産地", date: "生年月日", size: "全長 / 体重", generation: "血統 / 品種", sex: true },
    MAMMAL: { locality: "産地", date: "生年月日", size: "体重", generation: "血統", sex: true },
    FISH: { locality: "産地", date: "入荷日", size: "サイズ", generation: "累代 / 品種", sex: true },
    PLANT_ORNAMENTAL: { locality: "産地 / 入手元", date: "入手日 / 撮影日", size: "株サイズ / 鉢サイズ", generation: "実生 / カキコ", sex: false },
    PLANT_FOOD: { locality: "産地", date: "収穫日 / 購入日", size: "サイズ / 量", generation: "品種", sex: false },
};

// デフォルト
const DEFAULT_LABELS = { locality: "産地", date: "日付", size: "サイズ", generation: "詳細", sex: true };

type DetailsSectionProps = {
    type: ItemType;
    liveDetails: LiveDetails;
    supplyDetails: SupplyDetails;
    setLiveDetails: React.Dispatch<React.SetStateAction<LiveDetails>>;
    setSupplyDetails: React.Dispatch<React.SetStateAction<SupplyDetails>>;
};

export function DetailsSection({ type, liveDetails, supplyDetails, setLiveDetails, setSupplyDetails }: DetailsSectionProps) {
    const currentCategoryOption = CATEGORY_OPTIONS.find(opt => opt.value === type);

    // 現在のカテゴリー用のラベルを取得
    const labels = FIELD_LABELS[type] || DEFAULT_LABELS;

    return (
        <section className="bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">
                {currentCategoryOption?.label}の詳細情報（任意）
            </h2>

            <div className="space-y-6">

                {/* 用品 (SUPPLY) の場合 */}
                {type === "SUPPLY" ? (
                    <>
                        <div><label className={labelClass}>ブランド名</label><input className={inputClass} value={supplyDetails.brand} onChange={(e) => setSupplyDetails({ ...supplyDetails, brand: e.target.value })} placeholder="例：〇〇ファーム、メーカー名" /></div>
                        <div><label className={labelClass}>SKU / 型番</label><input className={inputClass} value={supplyDetails.sku} onChange={(e) => setSupplyDetails({ ...supplyDetails, sku: e.target.value })} placeholder="パッケージ記載の型番など" /></div>
                        <div><label className={labelClass}>内容量(g)</label><input type="number" className={inputClass} value={supplyDetails.net_weight_g} onChange={(e) => setSupplyDetails({ ...supplyDetails, net_weight_g: e.target.value })} placeholder="例：500" /></div>
                    </>
                ) : (
                    // 生体・植物などの場合 (共通入力フォームをラベルだけ変えて使い回す)
                    <>
                        {/* 1. 産地 / モルフ */}
                        <div>
                            <label className={labelClass}>{labels.locality}</label>
                            <input
                                className={inputClass}
                                value={liveDetails.locality}
                                onChange={(e) => setLiveDetails({ ...liveDetails, locality: e.target.value })}
                                placeholder={`例：${type === "INSECT" ? "兵庫県川西市" : type.includes("PLANT") ? "タイ輸入株" : "スーパーマックスノー"}`}
                            />
                        </div>

                        {/* 2. サイズ */}
                        <div>
                            <label className={labelClass}>{labels.size}</label>
                            <input
                                className={inputClass}
                                value={liveDetails.size}
                                onChange={(e) => setLiveDetails({ ...liveDetails, size: e.target.value })}
                                placeholder={`例：${type === "INSECT" ? "75mm" : type.includes("PLANT") ? "3号鉢" : "全長20cm"}`}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 3. 日付 (羽化日 / 生年月日 / 入手日) */}
                            <div>
                                <label className={labelClass}>{labels.date}</label>
                                <input
                                    type="date"
                                    className={inputClass}
                                    value={liveDetails.hatch_date}
                                    onChange={(e) => setLiveDetails({ ...liveDetails, hatch_date: e.target.value })}
                                />
                            </div>

                            {/* 4. 累代 / 血統 / 品種 (nullなら非表示) */}
                            {labels.generation && (
                                <div>
                                    <label className={labelClass}>{labels.generation}</label>
                                    <input
                                        className={inputClass}
                                        value={liveDetails.generation}
                                        onChange={(e) => setLiveDetails({ ...liveDetails, generation: e.target.value })}
                                        placeholder={`例：${type === "INSECT" ? "CBF1" : type.includes("PLANT") ? "実生" : "ワイルド個体"}`}
                                    />
                                </div>
                            )}
                        </div>

                        {/* 5. 性別 (植物などは非表示) */}
                        {labels.sex && (
                            <div>
                                <label className={labelClass}>性別</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {/* ラジオボタン風UI、あるいはSelectでもOK */}
                                    <select
                                        className={inputClass}
                                        value={liveDetails.sex}
                                        onChange={(e) => setLiveDetails({ ...liveDetails, sex: e.target.value as SexType })}
                                    >
                                        <option value="unknown">不明</option>
                                        <option value="male">オス</option>
                                        <option value="female">メス</option>
                                        <option value="pair">ペア</option>
                                        <option value="none">なし</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}