import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";

import api from "../../conf/api";
import { useToast } from "../../conf/function";
import { CATEGORY_OPTIONS, SHIPPING_FEE_TYPES_MAP, FleaItemStatus } from "../../conf/FleaMarket";

import { ImageAsset, FleaItemType } from "../../types/FleaMarket";

import ToastProvider from "../../component/ToastProvider";
import InlineSortableImages from "../../component/InlineSortableImages";
import ShipFromSelect from "../../component/ShipFromSelect";

import AddImagesModal from "../../modal/AddImagesModal";


type SexType = "male" | "female" | "unknown" | "pair";
type StepKey = "main" | "details";

const FleaItemEditContent: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    // ==========================================
    // States
    // ==========================================
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [current, setCurrent] = useState<StepKey>("main");

    // Form States
    const [name, setName] = useState("");
    const [price, setPrice] = useState<number | "">("");
    const [quantity, setQuantity] = useState(1);
    const [isMultiPurchasable, setIsMultiPurchasable] = useState(false);
    const [type, setType] = useState<FleaItemType>("ANIMAL");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<number>(0);

    // Shipping & Settings
    const [shippingFeeType, setShippingFeeType] = useState<number>(0);
    const [shipFromId, setShipFromId] = useState<number | null>(null);
    const [shipsWithinDays, setShipsWithinDays] = useState<number | "">(2);
    const [sellerPlusPct, setSellerPlusPct] = useState<number>(0);

    // Images
    const [images, setImages] = useState<ImageAsset[]>([]);
    const [addOpen, setAddOpen] = useState(false);

    // Details
    const [liveDetails, setLiveDetails] = useState({
        locality: "", hatch_date: "", generation: "", size: "", sex: "unknown" as SexType,
    });
    const [supplyDetails, setSupplyDetails] = useState({
        brand: "", sku: "", net_weight_g: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Settings
    const MIN_PLUS_PCT = 0;
    const MAX_PLUS_PCT = 8;
    const STEP_PLUS_PCT = 1;

    // ==========================================
    // 1. Data Fetching
    // ==========================================
    useEffect(() => {
        if (!id) return;
        const fetchItem = async () => {
            try {
                const res = await api.get(`/flea-market/item/${id}`);
                const { item, details, images: apiImages } = res.data;

                setName(item.name);
                setPrice(item.price);
                setQuantity(item.quantity);
                setIsMultiPurchasable(item.is_multi_purchasable ?? (item.quantity > 1));
                setType(item.type);
                setDescription(item.description);
                setSellerPlusPct(item.seller_plus_pct || 0);

                setShippingFeeType(Number(item.shippingFeeType ?? 0));
                setShipFromId(item.shipFrom ?? null);
                setShipsWithinDays(item.shipsWithinDays ?? 2);
                setStatus(item.status);

                if (apiImages && Array.isArray(apiImages)) {
                    const loadedImages: ImageAsset[] = apiImages.map((img: ImageAsset) => ({
                        id: String(img.id),
                        serverId: Number(img.id), // serverIdがある＝既存画像
                        url: img.url,
                    }));
                    setImages(loadedImages);
                }

                if (item.type === "ANIMAL" && details.animal_details) {
                    const d = details.animal_details;
                    setLiveDetails({
                        locality: d.locality || "",
                        hatch_date: d.hatch_date ? d.hatch_date.split("T")[0] : "",
                        generation: d.generation || "",
                        size: d.size || "",
                        sex: (d.sex as SexType) || "unknown",
                    });
                } else if (item.type === "SUPPLY" && details.supply_details) {
                    const d = details.supply_details;
                    setSupplyDetails({
                        brand: d.brand || "",
                        sku: d.sku || "",
                        net_weight_g: d.net_weight_g ? String(d.net_weight_g) : "",
                    });
                }

            } catch (error) {
                console.error(error);
                toast({ text: "商品情報の取得に失敗しました", kind: "error" });
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };
        fetchItem();
    }, [id, navigate, toast]);

    // ==========================================
    // Logic
    // ==========================================
    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "商品名を入力してください";
        const p = Number(price);
        if (!price || isNaN(p) || p <= 0) e.price = "価格は 1 以上の数値で入力してください";
        if (images.length === 0) e.images = "商品画像を 1 枚以上追加してください";
        if (shipFromId === null) e.shipFrom = "発送元を選択してください";
        if (shipsWithinDays === "") e.shipsWithinDays = "発送目安を選択してください";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const validateStep = (key: StepKey): boolean => key === "main" ? validate() : true;

    // モーダルから追加された画像を処理する関数
    // 作成ページとは違い、ここでは「アップロード」せずに「Stateに追加するだけ」にします
    const handleAddImages = (nextImages: ImageAsset[]) => {
        const processedImages = nextImages.map((img) => {
            // 1. 既にURLがある場合（サーバー画像 or 既にプレビュー生成済み）はそのまま
            if (img.url) return img;

            // 2. 新規ファイルだがURLがない場合、プレビューURLを作る
            if (img.file) {
                return {
                    ...img,
                    id: img.id || Math.random().toString(36), // IDがなければ仮発行
                    url: URL.createObjectURL(img.file),       // ★これがないと表示されない！
                };
            }

            return img;
        });

        setImages(processedImages);
        setAddOpen(false);
    };

    // Submit (Update)
    const handleSubmit = async () => {
        if (submitting) return;
        if (!validate()) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        if (!confirm("変更内容を保存しますか？")) return;

        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("name", name.trim());
            fd.append("description", description.trim());
            fd.append("price", String(Number(price)));
            fd.append("quantity", String(isMultiPurchasable ? quantity : 1));
            fd.append("shipping_fee_type", String(shippingFeeType));
            console.log(status);
            fd.append("status", String(status));
            if (shipFromId !== null) fd.append("ship_from", String(shipFromId));
            if (shipsWithinDays !== "") fd.append("days_to_ship", String(shipsWithinDays));
            fd.append("seller_plus_pct", String(sellerPlusPct));

            // ===============================================
            // ★ 画像の並び順とファイルを整理して送る
            // ===============================================

            // 1. 新規画像ファイルの実体だけを抽出した配列を作る
            const newImageFiles: File[] = [];
            images.forEach(img => {
                if (img.file) newImageFiles.push(img.file);
            });

            // 2. new_images としてファイルを追加
            newImageFiles.forEach(file => {
                fd.append("new_images", file);
            });

            // 3. 「並び順情報」を作成 (JSON文字列として送る)
            // 例: [ {type:"existing", id:10}, {type:"new", index:0}, {type:"existing", id:12} ... ]
            let newFileIndex = 0;
            const sortOrder = images.map(img => {
                if (img.serverId !== undefined) {
                    // 既存画像
                    return { type: "existing", id: Number(img.serverId) };
                } else {
                    // 新規画像 (newFileIndex番目のファイル)
                    const item = { type: "new", index: newFileIndex };
                    newFileIndex++;
                    return item;
                }
            });
            fd.append("sort_order", JSON.stringify(sortOrder));

            // 4. 削除用 (DBにあり、かつ今回のリストに含まれないIDを計算)
            const keptIds = images
                .filter(img => img.serverId !== undefined)
                .map(img => Number(img.serverId));
            fd.append("kept_image_ids", JSON.stringify(keptIds));
            // ===============================================

            // 詳細情報 (変更なし)
            if (type === "ANIMAL") {
                fd.append("locality", liveDetails.locality);
                fd.append("hatch_date", liveDetails.hatch_date);
                fd.append("size", liveDetails.size);
                fd.append("generation", liveDetails.generation);
                fd.append("sex", liveDetails.sex);
            } else {
                fd.append("brand", supplyDetails.brand);
                fd.append("sku", supplyDetails.sku);
                fd.append("net_weight", supplyDetails.net_weight_g);
            }

            await api.post(`/flea-market/item/edit/${id}`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast({ text: "商品情報を更新しました！", kind: "success" });
            navigate(`/flea-market/item/${id}`);

        } catch (error) {
            console.error(error);
            toast({ text: "更新に失敗しました", kind: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    // ==========================================
    // Render
    // ==========================================
    const goNext = () => {
        if (current === "main") {
            if (!validateStep("main")) {
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }
            setCurrent("details");
        }
    };
    const goPrev = () => { if (current === "details") setCurrent("main"); };

    const sellerPlusPctOptions = useMemo(() =>
        Array.from({ length: Math.round((MAX_PLUS_PCT - MIN_PLUS_PCT) / STEP_PLUS_PCT) + 1 }, (_, i) => MIN_PLUS_PCT + STEP_PLUS_PCT * i),
        []);

    const inputClass = "w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition-colors";
    const labelClass = "block mb-2 text-sm font-bold text-gray-700";
    const sectionClass = "bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm";

    // Fee Calculations
    const FEE_BASE = 0.10;
    const FEE_PER_PLUS_PCT = 0.01;
    const FEE_MAX = 0.25;
    const priceNum = Number(price) || 0;
    const plusPct = Math.max(MIN_PLUS_PCT, Math.min(MAX_PLUS_PCT, Math.floor(sellerPlusPct)));
    const feeRate = Math.min(FEE_MAX, FEE_BASE + plusPct * FEE_PER_PLUS_PCT);
    const feeYen = Math.floor(priceNum * feeRate);
    const payoutYen = Math.max(0, Math.floor(priceNum - feeYen));
    const [feeOpen, setFeeOpen] = useState(false);

    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans pb-32">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
                <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="font-bold text-base">商品の編集</h1>
                    </div>
                </div>
                {/* Stepper */}
                <div className="max-w-lg mx-auto px-4 h-1 flex w-full">
                    <div className={`h-full transition-all duration-300 ${current === 'main' ? 'w-1/2 bg-blue-600' : 'w-full bg-green-500'}`} />
                    <div className="h-full w-full bg-gray-200" />
                </div>
            </div>

            {/* Main Content */}
            <main className="py-6 space-y-6 pb-0 max-w-xl mx-auto pt-6 px-4">

                {current === "main" && (
                    <>
                        {/* 1. Image Upload (Using InlineSortableImages) */}
                        <section className={sectionClass}>
                            <div className="flex items-center justify-between mb-4">
                                <label className={labelClass}>
                                    商品画像 <span className="text-red-500 ml-1">*</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                        {images.length} / 10
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setAddOpen(true)}
                                        disabled={images.length >= 10}
                                        className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ＋画像を追加
                                    </button>
                                </div>
                            </div>

                            {errors.images && (
                                <p className="text-sm text-red-500 mb-3 bg-red-50 p-3 rounded-lg flex items-center gap-2">
                                    ⚠️ {errors.images}
                                </p>
                            )}

                            <div className="min-h-[120px]">
                                {/* 作成ページと同じコンポーネントを使用 */}
                                <InlineSortableImages
                                    files={images}
                                    onChange={(next) => { setImages(next); }}
                                    onOpenAdd={() => setAddOpen(true)}
                                    max={10}
                                />
                            </div>
                        </section>

                        {/* 2. Basic Info */}
                        <section className={sectionClass}>
                            <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">基本情報</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className={labelClass}>商品名 <span className="text-red-500">*</span></label>
                                    <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
                                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>商品の説明 <span className="text-red-500">*</span></label>
                                    <textarea className={`${inputClass} min-h-[150px] resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>カテゴリー</label>
                                        <div className="relative">
                                            <select className={`${inputClass} appearance-none cursor-not-allowed bg-gray-100`} value={type} disabled>
                                                {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>数量</label>
                                        <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden h-[46px]">
                                            <button className="w-10 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 border-r" onClick={() => setQuantity(q => Math.max(1, q - 1))}>－</button>
                                            <div className="flex-1 text-center font-bold">{quantity}</div>
                                            <button className="w-10 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 border-l" onClick={() => setQuantity(q => q + 1)}>＋</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 3. Shipping */}
                        <section className={sectionClass}>
                            <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">配送について</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className={labelClass}>配送料の負担</label>
                                    <div className="flex gap-2">
                                        {[0, 1, 2].map((ft) => (
                                            <label key={ft} className={`flex-1 cursor-pointer border rounded-lg p-3 text-sm text-center transition-all ${shippingFeeType === ft ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                                                <input type="radio" className="hidden" checked={shippingFeeType === ft} onChange={() => setShippingFeeType(ft)} />
                                                {SHIPPING_FEE_TYPES_MAP.find(m => Number(m.id) === ft)?.label || "その他"}
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
                                        <option value="1">1〜2日で発送</option>
                                        <option value="2">2〜3日で発送</option>
                                        <option value="4">4〜7日で発送</option>
                                    </select>
                                    {errors.shipsWithinDays && <p className="text-xs text-red-500 mt-1">{errors.shipsWithinDays}</p>}
                                </div>
                            </div>
                        </section>

                        {/* 4. Price */}
                        <section className={sectionClass}>
                            <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">販売価格</h2>
                            <div className="flex items-center gap-4">
                                <label className="font-bold text-gray-700 whitespace-nowrap">価格</label>
                                <div className="relative w-full">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500 font-bold">¥</div>
                                    <input className={`${inputClass} pl-8 text-right text-lg font-bold`} type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                                </div>
                            </div>
                            {errors.price && <p className="text-xs text-red-500 text-right mt-1">{errors.price}</p>}

                            {/* Fee Calculation */}
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

                            {/* Fee Option */}
                            <div className="pt-2">
                                <button className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 w-full justify-end" onClick={() => setFeeOpen(!feeOpen)}>
                                    {feeOpen ? "▲ オプションを閉じる" : "▼ 購入者割引を設定する（任意）"}
                                </button>
                                {feeOpen && (
                                    <div className="mt-3 bg-gray-50 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-gray-700">割引率</span>
                                            <select className="bg-white border border-gray-300 rounded px-2 py-1 text-sm" value={plusPct} onChange={(e) => setSellerPlusPct(Number(e.target.value))}>
                                                {sellerPlusPctOptions.map((v) => <option key={v} value={v}>{v === 0 ? "設定なし" : `+${v}%`}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 4. 公開設定 (★追加) */}
                        <section className={sectionClass}>
                            <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">公開設定</h2>
                            <div className="space-y-4">
                                <div className="flex gap-4 items-center">
                                    <label className="font-bold text-gray-700">出品ステータス</label>
                                    <div className="flex gap-2">
                                        {/* 公開中 (1) */}
                                        <label className={`cursor-pointer border rounded-lg px-4 py-2 text-sm font-bold transition-all ${status === FleaItemStatus.Active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                                            <input type="radio" className="hidden" checked={status === FleaItemStatus.Active} onChange={() => setStatus(FleaItemStatus.Active)} />
                                            公開する
                                        </label>

                                        {/* 下書き/非公開 (0) */}
                                        <label className={`cursor-pointer border rounded-lg px-4 py-2 text-sm font-bold transition-all ${status === FleaItemStatus.Draft ? "bg-gray-600 text-white border-gray-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                                            <input type="radio" className="hidden" checked={status === FleaItemStatus.Draft} onChange={() => setStatus(FleaItemStatus.Draft)} />
                                            下書き（非公開）
                                        </label>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    「下書き」にすると、検索結果や一覧に表示されなくなり、購入されません。
                                </p>
                            </div>
                        </section>
                    </>
                )}

                {/* Details (Step 2) */}
                {current === "details" && (
                    <section className={sectionClass}>
                        <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">詳細情報</h2>
                        {type === "ANIMAL" ? (
                            <div className="space-y-6">
                                <div><label className={labelClass}>産地</label><input className={inputClass} value={liveDetails.locality} onChange={(e) => setLiveDetails({ ...liveDetails, locality: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className={labelClass}>羽化日</label><input type="date" className={inputClass} value={liveDetails.hatch_date} onChange={(e) => setLiveDetails({ ...liveDetails, hatch_date: e.target.value })} /></div>
                                    <div><label className={labelClass}>サイズ</label><input className={inputClass} value={liveDetails.size} onChange={(e) => setLiveDetails({ ...liveDetails, size: e.target.value })} placeholder="例: 75mm" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className={labelClass}>累代</label><input className={inputClass} value={liveDetails.generation} onChange={(e) => setLiveDetails({ ...liveDetails, generation: e.target.value })} placeholder="例: F1" /></div>
                                    <div>
                                        <label className={labelClass}>性別</label>
                                        <select className={inputClass} value={liveDetails.sex} onChange={(e) => setLiveDetails({ ...liveDetails, sex: e.target.value as SexType })}>
                                            <option value="unknown">不明</option>
                                            <option value="male">オス</option>
                                            <option value="female">メス</option>
                                            <option value="pair">ペア</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div><label className={labelClass}>ブランド名</label><input className={inputClass} value={supplyDetails.brand} onChange={(e) => setSupplyDetails({ ...supplyDetails, brand: e.target.value })} /></div>
                                <div><label className={labelClass}>SKU / 型番</label><input className={inputClass} value={supplyDetails.sku} onChange={(e) => setSupplyDetails({ ...supplyDetails, sku: e.target.value })} /></div>
                                <div><label className={labelClass}>内容量(g)</label><input type="number" className={inputClass} value={supplyDetails.net_weight_g} onChange={(e) => setSupplyDetails({ ...supplyDetails, net_weight_g: e.target.value })} /></div>
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* スペーサー */}
            <div className="h-24" />

            {/* Footer Actions */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
                <div className="max-w-lg mx-auto flex gap-3">
                    <button
                        onClick={goPrev}
                        className="flex-1 bg-gray-100 text-gray-700 font-bold h-12 rounded-lg disabled:opacity-30"
                        disabled={current === "main"}
                    >
                        戻る
                    </button>

                    {current === "main" ? (
                        <button onClick={goNext} className="flex-[2] bg-gray-800 text-white font-bold h-12 rounded-lg hover:bg-gray-700">
                            次へ（詳細情報）
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={`flex-[2] font-bold h-12 rounded-lg text-white ${submitting ? "bg-gray-400" : "bg-red-500 hover:bg-red-600 shadow-md"}`}
                        >
                            {submitting ? <Loader2 className="animate-spin inline mr-2" /> : null}
                            {submitting ? "保存中..." : "変更を保存する"}
                        </button>
                    )}
                </div>
            </div>

            {/* Add Images Modal (Used for selection only) */}
            <AddImagesModal
                open={addOpen}
                initialImages={images}
                onClose={() => setAddOpen(false)}
                onSave={handleAddImages} // Call modified handler
            />
        </div>
    );
};

// Wrapper for Toast
export default function FleaItemEditWrapper() {
    return (
        <ToastProvider>
            <FleaItemEditContent />
        </ToastProvider>
    );
}