import { useState } from "react";
import ShipFromSelect from "../component/ShipFromSelect";
import { FormCalculations, FormSetters, FormState } from "../types/FleaMarketForm";

const inputClass = "w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition-colors";
const labelClass = "block mb-2 text-sm font-bold text-gray-700";

type ShippingPriceSectionProps = {
    formState: FormState;
    setters: FormSetters;
    calc: FormCalculations;
    errors: Record<string, string>;
};

export function ShippingPriceSection({ formState, setters, calc, errors }: ShippingPriceSectionProps) {
    const { price, shippingFeeType, shipFromId, shipsWithinDays, sellerPlusPct } = formState;
    const { setPrice, setShippingFeeType, setShipFromId, setShipsWithinDays, setSellerPlusPct } = setters;
    const { feeYen, payoutYen, sellerPlusPctOptions, feeRate } = calc;

    const [feeOpen, setFeeOpen] = useState(false);

    return (
        <>
            <section className="bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">配送について</h2>
                <div className="space-y-6">
                    <div>
                        <label className={labelClass}>配送料の負担</label>
                        <div className="flex gap-2">
                            {[0, 1, 2].map((val) => (
                                <label key={val} className={`flex-1 cursor-pointer border rounded-lg p-3 text-sm text-center transition-all ${shippingFeeType === val ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                                    <input type="radio" className="hidden" checked={shippingFeeType === val} onChange={() => setShippingFeeType(val as 0 | 1 | 2)} />
                                    {val === 0 ? "送料込み" : val === 1 ? "着払い" : "送料別"}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>発送元の地域</label>
                        <ShipFromSelect value={shipFromId} onChange={setShipFromId} error={errors.shipFrom} />
                    </div>

                    <div>
                        <label className={labelClass}>発送までの日数</label>
                        <select className={inputClass} value={shipsWithinDays} onChange={(e) => setShipsWithinDays(e.target.value === "" ? "" : Number(e.target.value))}>
                            <option value="">選択してください</option>
                            <option value="1">1〜2日で発送</option>
                            <option value="2">2〜3日で発送</option>
                            <option value="4">4〜7日で発送</option>
                        </select>
                        {errors.shipsWithinDays && <p className="text-xs text-red-500 mt-1">{errors.shipsWithinDays}</p>}
                    </div>
                </div>
            </section>

            <section className="bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">販売価格</h2>
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <label className="font-bold text-gray-700 whitespace-nowrap">価格</label>
                        <div className="relative w-full">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500 font-bold">¥</span>
                            <input
                                className={`${inputClass} pl-8 text-right text-lg font-bold`}
                                inputMode="decimal"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                    </div>
                    {errors.price && <p className="text-xs text-red-500 text-right">{errors.price}</p>}

                    <div className="space-y-3 pt-4 border-t border-dashed border-gray-200">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">販売手数料 ({Math.round(feeRate * 100)}%)</span>
                            <span className="text-gray-800">¥{feeYen.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold">
                            <span className="text-gray-800">販売利益</span>
                            <span className="text-blue-600">¥{payoutYen.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="button"
                            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 w-full justify-end"
                            onClick={() => setFeeOpen(!feeOpen)}
                        >
                            {feeOpen ? "▲ オプションを閉じる" : "▼ 購入者割引を設定する（任意）"}
                        </button>

                        {feeOpen && (
                            <div className="mt-3 bg-gray-50 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-gray-700">割引率</span>
                                    <select className="bg-white border border-gray-300 rounded px-2 py-1 text-sm" value={sellerPlusPct} onChange={(e) => setSellerPlusPct(Number(e.target.value))}>
                                        {sellerPlusPctOptions.map((v: number) => <option key={v} value={v}>{v === 0 ? "設定なし" : `+${v}%`}</option>)}
                                    </select>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    売上から少し手数料を多く払うことで、購入者にポイント還元などのメリットを提供し、売れやすくします。
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </>
    );
}