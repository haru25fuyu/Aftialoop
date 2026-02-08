import React from "react";
import { CATEGORY_OPTIONS } from "../conf/Market";
import { ItemType } from "../types/Market";
import { LiveDetails, SupplyDetails, SexType } from "../types/FleaMarketForm";

const inputClass = "w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition-colors";
const labelClass = "block mb-2 text-sm font-bold text-gray-700";

type DetailsSectionProps = {
    type: ItemType;
    liveDetails: LiveDetails;
    supplyDetails: SupplyDetails;
    setLiveDetails: React.Dispatch<React.SetStateAction<LiveDetails>>;
    setSupplyDetails: React.Dispatch<React.SetStateAction<SupplyDetails>>;
};

export function DetailsSection({ type, liveDetails, supplyDetails, setLiveDetails, setSupplyDetails }: DetailsSectionProps) {
    const currentCategoryOption = CATEGORY_OPTIONS.find(opt => opt.value === type);

    return (
        <section className="bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">
                {currentCategoryOption?.label}の詳細情報（任意）
            </h2>

            <div className="space-y-6">
                {/* 共通: 産地 (用品以外) */}
                {type !== "SUPPLY" && (
                    <div>
                        <label className={labelClass}>産地 / 生産地</label>
                        <input className={inputClass} value={liveDetails.locality} onChange={(e) => setLiveDetails({ ...liveDetails, locality: e.target.value })} placeholder="例：兵庫県、タイ産など" />
                    </div>
                )}

                {/* サイズ */}
                {type !== "SUPPLY" && (
                    <div>
                        <label className={labelClass}>
                            {type.startsWith("PLANT") ? "サイズ (鉢・株)" : "サイズ (体長)"}
                        </label>
                        <input className={inputClass} value={liveDetails.size} onChange={(e) => setLiveDetails({ ...liveDetails, size: e.target.value })} placeholder={type.startsWith("PLANT") ? "例：3号鉢、板付け20cm" : "例：75mm"} />
                    </div>
                )}

                {/* 羽化日・累代・性別 */}
                {!type.startsWith("PLANT") && type !== "SUPPLY" && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>
                                    {type === "MAMMAL" ? "誕生日" : "羽化日 / 孵化日"}
                                </label>
                                <input type="date" className={inputClass} value={liveDetails.hatch_date} onChange={(e) => setLiveDetails({ ...liveDetails, hatch_date: e.target.value })} />
                            </div>
                            {type === "INSECT" && (
                                <div>
                                    <label className={labelClass}>累代</label>
                                    <input className={inputClass} value={liveDetails.generation} onChange={(e) => setLiveDetails({ ...liveDetails, generation: e.target.value })} placeholder="例：CBF1" />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className={labelClass}>性別</label>
                            <select
                                className={inputClass}
                                value={liveDetails.sex}
                                // ★ここを修正！ as SexType を追加
                                onChange={(e) => setLiveDetails({ ...liveDetails, sex: e.target.value as SexType })}
                            >
                                <option value="unknown">不明</option>
                                <option value="male">オス</option>
                                <option value="female">メス</option>
                                <option value="pair">ペア</option>
                            </select>
                        </div>
                    </>
                )}

                {/* 用品の場合 */}
                {type === "SUPPLY" && (
                    <>
                        <div><label className={labelClass}>ブランド名</label><input className={inputClass} value={supplyDetails.brand} onChange={(e) => setSupplyDetails({ ...supplyDetails, brand: e.target.value })} /></div>
                        <div><label className={labelClass}>SKU / 型番</label><input className={inputClass} value={supplyDetails.sku} onChange={(e) => setSupplyDetails({ ...supplyDetails, sku: e.target.value })} /></div>
                        <div><label className={labelClass}>内容量(g)</label><input type="number" className={inputClass} value={supplyDetails.net_weight_g} onChange={(e) => setSupplyDetails({ ...supplyDetails, net_weight_g: e.target.value })} /></div>
                    </>
                )}
            </div>
        </section>
    );
}