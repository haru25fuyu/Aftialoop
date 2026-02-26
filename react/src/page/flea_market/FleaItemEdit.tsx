import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";

import api from "../../conf/api";
import { useToast } from "../../conf/function";
import { FleaItemStatus } from "../../conf/FleaMarket";

// 型定義
import { ImageAsset } from "../../types/FleaMarket";
import { ItemType } from "../../types/Market";
import { LiveDetails, SupplyDetails, SexType, FormState, FormSetters, FormCalculations, CategorySearchResult } from "../../types/FleaMarketForm";

// コンポーネント
import { ImageSection } from "../../steps/ImageSection";
import { BasicInfoSection } from "../../steps/BasicInfoSection";
import { ShippingPriceSection } from "../../steps/ShippingPriceSection";
import { DetailsSection } from "../../steps/DetailsSection";

import AddImagesModal from "../../modal/AddImagesModal";

// Constants
const FEE_BASE = 0.1;
const FEE_PER_PLUS_PCT = 0.01;
const FEE_MAX = 0.25;
const MIN_PLUS_PCT = 0;
const MAX_PLUS_PCT = 8;
const STEP_PLUS_PCT = 1;

const FleaItemEdit: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    // ==========================================
    // Local States (フックを使わずここで管理)
    // ==========================================
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // 基本情報
    const [name, setName] = useState("");
    const [price, setPrice] = useState<string>("");
    const [quantity, setQuantity] = useState(1);
    const [isMultiPurchasable, setIsMultiPurchasable] = useState(false);
    const [description, setDescription] = useState("");
    const [type, setType] = useState<ItemType>("ANIMAL");
    const [mainIndex, setMainIndex] = useState<number>(0);

    // カテゴリ・種別
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [categoryName, setCategoryName] = useState<string | null>(null);
    const [supplyTypeId, setSupplyTypeId] = useState<number | null>(null);

    // 設定・配送
    const [status, setStatus] = useState<number>(FleaItemStatus.Active);
    const [shippingFeeType, setShippingFeeType] = useState<0 | 1 | 2>(0);
    const [shipFromId, setShipFromId] = useState<number | null>(null);
    const [shipsWithinDays, setShipsWithinDays] = useState<number | "">(2);
    const [sellerPlusPct, setSellerPlusPct] = useState<number>(0);

    // 画像
    const [images, setImages] = useState<ImageAsset[]>([]);

    // 詳細情報 (UI用ステート)
    const [liveDetails, setLiveDetails] = useState<LiveDetails>({
        locality: "", hatch_date: "", generation: "", size: "", sex: "unknown" as SexType
    });
    const [supplyDetails, setSupplyDetails] = useState<SupplyDetails>({

        kind: "SUPPLY",
        brand: "",
        sku: "",
        net_weight_g: "",
        supply_type_id: null,
        target_category_id: null,
        target_category_name: "",
    });

    // モーダル管理
    const [addOpen, setAddOpen] = useState(false);

    // ステップ管理 (UI表示切り替え用)
    const [currentStep, setCurrentStep] = useState<"main" | "details">("main");
    // エラー管理
    const [errors, setErrors] = useState<Record<string, string>>({});

    // ==========================================
    // Helper Objects (サブコンポーネントに渡す用)
    // ==========================================

    // formStateオブジェクトを作成して、フックを使っているかのように見せかける
    const formState: FormState = {
        images, name, price, quantity, isMultiPurchasable, type,
        categoryId, categoryName, supplyTypeId, description,
        shippingFeeType, shipFromId, shipsWithinDays, sellerPlusPct,
        liveDetails, supplyDetails, mainIndex
    };

    // settersオブジェクト
    const setters: FormSetters = {
        setName, setPrice, setQuantity, setIsMultiPurchasable, setType,
        setCategoryId, setCategoryName, setSupplyTypeId, setDescription,
        setShippingFeeType, setShipFromId, setShipsWithinDays, setSellerPlusPct,
        setImages, setLiveDetails, setSupplyDetails,
        setCurrentStep, setMainIndex
    };

    const feeRate = Math.min(
        FEE_MAX,
        FEE_BASE +
        Math.max(
            MIN_PLUS_PCT,
            Math.min(MAX_PLUS_PCT, Math.floor(sellerPlusPct)),
        ) *
        FEE_PER_PLUS_PCT,
    );
    const feeYen = Math.floor((Number(price) || 0) * feeRate);
    const payoutYen = Math.max(0, Math.floor((Number(price) || 0) - feeYen));
    const sellerPlusPctOptions = useMemo(
        () =>
            Array.from(
                {
                    length: Math.round((MAX_PLUS_PCT - MIN_PLUS_PCT) / STEP_PLUS_PCT) + 1,
                },
                (_, i) => MIN_PLUS_PCT + STEP_PLUS_PCT * i,
            ),
        [],
    );

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "商品名を入力してください";
        const p = Number(price);
        if (!price || isNaN(p) || p <= 0)
            e.price = "価格は 1 以上の数値で入力してください";
        if (!isMultiPurchasable && quantity !== 1)
            e.quantity = "単品出品では数量は 1 固定です";
        if (quantity < 1) e.quantity = "数量は 1 以上";
        if (images.length === 0) e.images = "商品画像を 1 枚以上追加してください";
        if (shipFromId === null) e.shipFrom = "発送元を選択してください";
        if (shipsWithinDays === "")
            e.shipsWithinDays = "発送目安を選択してください";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // 計算ロジック (簡易実装)
    const calc: FormCalculations = {
        feeRate,
        feeYen,
        payoutYen,
        sellerPlusPctOptions,
    };

    // ==========================================
    // 1. データ取得
    // ==========================================
    useEffect(() => {
        if (!id) return;

        const fetchItem = async () => {
            try {
                const res = await api.get(`/flea-market/item/${id}`);
                const data = res.data;

                if (!data || !data.item) {
                    throw new Error("商品データがありません");
                }

                const item = data.item;
                const apiImages = data.images;

                // ステートへの反映
                setName(item.name || "");
                setPrice(item.price || "");
                setQuantity(item.quantity || 1);
                setIsMultiPurchasable(item.is_multi_purchasable ?? (item.quantity > 1));
                setDescription(item.description ?? "");
                setType(item.type || "ANIMAL");
                setStatus(item.status ?? FleaItemStatus.Active);

                setCategoryId(item.category_id ?? null);
                setCategoryName(item.category_name ?? null);
                setSupplyTypeId(item.supply_type_id ?? null);

                setShippingFeeType(item.shippingFeeType ?? 0);
                setShipFromId(item.shipFrom ?? null);
                setShipsWithinDays(item.ships_within_days ?? 2);
                setSellerPlusPct(item.seller_plus_pct || 0);

                // 画像
                if (Array.isArray(apiImages)) {
                    setImages(apiImages.map((img: ImageAsset) => ({
                        id: String(img.id),
                        serverId: Number(img.id),
                        url: img.url
                    })));
                }

                // ★ 詳細情報のパース (JSON文字列 -> UIステート)
                let d = item.details;
                if (typeof d === "string") {
                    try { d = JSON.parse(d); } catch { d = {}; }
                }

                if (d) {
                    if (item.type === "SUPPLY") {
                        setSupplyDetails({
                            kind: "SUPPLY",
                            brand: d.brand || "",
                            sku: d.sku || "",
                            net_weight_g: d.net_weight_g || "",
                            supply_type_id: d.supply_type_id || null,
                            target_category_id: d.target_category_id || null,
                            target_category_name: d.target_category_name || "",
                        });
                    } else {
                        setLiveDetails({
                            locality: d.locality || "",
                            hatch_date: d.hatch_date ? d.hatch_date.split("T")[0] : "",
                            generation: d.generation || "",
                            size: d.size || "",
                            sex: d.sex || "unknown"
                        });
                    }
                }

            } catch (error) {
                console.error("Fetch failed:", error);
                toast({ text: "データの取得に失敗しました", kind: "error" });
                // navigate(-1); // 自動遷移はさせない
            } finally {
                setLoading(false);
            }
        };

        fetchItem();
    }, [id, toast]); // navigateは依存配列から外すか、使用しない

    // ==========================================
    // 2. 更新処理
    // ==========================================
    const handleSubmit = async () => {
        if (submitting || !validate()) {
            setCurrentStep("main");
            return;
        }
        // 簡易バリデーション
        if (!name || !price || images.length === 0) {
            toast({ text: "必須項目が不足しています", kind: "error" });
            return;
        }

        if (!confirm("変更を保存しますか？")) return;

        setSubmitting(true);
        try {
            const fd = new FormData();

            // 基本フィールド
            fd.append("name", name);
            fd.append("description", description);
            fd.append("price", String(price));
            fd.append("quantity", String(isMultiPurchasable ? quantity : 1));
            fd.append("status", String(status));
            fd.append("shipping_fee_type", String(shippingFeeType));
            if (shipFromId) fd.append("ship_from", String(shipFromId));
            if (shipsWithinDays) fd.append("days_to_ship", String(shipsWithinDays));
            fd.append("seller_plus_pct", String(sellerPlusPct));

            if (categoryId) fd.append("category_id", String(categoryId));
            if (supplyTypeId) fd.append("supply_type_id", String(supplyTypeId));
            if (categoryName) fd.append("category_name", categoryName);

            // 画像処理
            images.forEach(img => {
                if (img.file) fd.append("new_images", img.file);
            });

            // 並び順 (Sort Order)
            let newIdx = 0;
            const sortOrder = images.map(img => {
                if (img.serverId !== undefined) {
                    return { type: "existing", id: img.serverId };
                } else {
                    return { type: "new", index: newIdx++ };
                }
            });
            fd.append("sort_order", JSON.stringify(sortOrder));

            // 残す画像のID
            const keptIds = images
                .filter(img => img.serverId !== undefined)
                .map(img => img.serverId);
            fd.append("kept_image_ids", JSON.stringify(keptIds));

            // ★ 詳細情報の構築 (JSON文字列化)
            let detailsPayload = {};
            if (type === "SUPPLY") {
                detailsPayload = { ...supplyDetails };
            } else {
                detailsPayload = { ...liveDetails };
            }
            fd.append("details", JSON.stringify(detailsPayload));

            // API送信
            await api.post(`/flea-market/item/edit/${id}`, fd, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            toast({ text: "更新しました", kind: "success" });
            navigate(`/flea-market/item/${id}`);

        } catch (error) {
            console.error(error);
            toast({ text: "更新に失敗しました", kind: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    // 画像追加時の処理
    const handleAddImages = (next: ImageAsset[]) => {
        setImages(next);
        setAddOpen(false);
    };

    const handleCategorySelect = (item: CategorySearchResult) => {
        // 1. 表示名をセット
        setters.setCategoryName(item.full_path_name || item.name);

        if (item.is_supply || item.type === 'supply') {
            // ★用品の場合
            // 'SUPPLY' が ItemType に含まれているはずですが、念のためキャストしておくと安全です
            setters.setType('SUPPLY' as ItemType);

            setters.setCategoryId(item.parent_id || item.category_id || 0);
            setters.setSupplyTypeId(item.supply_type_id || item.id);

        } else {
            // ★生体の場合
            // item.built_in_type は string なので、 as ItemType で型を強制します
            const targetType = (item.built_in_type as ItemType) || 'INSECT';
            setters.setType(targetType);

            setters.setCategoryId(item.id);
            setters.setSupplyTypeId(0);
        }

        // カテゴリー設定の通知
        //toast.apply("カテゴリーが設定されました");
    };


    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    // ==========================================
    // Render
    // ==========================================
    return (
        <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans pb-32">
            {/* ヘッダー */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
                <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="font-bold text-base">商品の編集</h1>
                    </div>
                </div>
                {/* ステッパーバー */}
                <div className="max-w-lg mx-auto px-4 h-1 flex w-full">
                    <div className={`h-full transition-all duration-300 ${currentStep === 'main' ? 'w-1/2 bg-blue-600' : 'w-full bg-green-500'}`} />
                    <div className="h-full w-full bg-gray-200" />
                </div>
            </div>

            <main className="max-w-xl mx-auto pt-6 px-4 space-y-6">
                {currentStep === "main" && (
                    <>
                        {/* 画像セクション */}
                        <ImageSection
                            images={images}
                            onChange={setImages}
                            onOpenAdd={() => setAddOpen(true)}
                            error={errors.images}
                        />

                        {/* 基本情報セクション */}
                        <BasicInfoSection
                            formState={formState}
                            setters={setters}
                            errors={errors}
                            onCategorySelect={handleCategorySelect}
                        />

                        {/* 公開設定 (独自UI) */}
                        <section className="bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-lg font-bold mb-4 pb-2 border-b border-gray-100">公開設定</h2>
                            <div className="flex gap-2">
                                <label className={`cursor-pointer border rounded-lg px-4 py-2 text-sm font-bold ${status === FleaItemStatus.Active ? "bg-blue-600 text-white" : "bg-white"}`}>
                                    <input type="radio" className="hidden" checked={status === FleaItemStatus.Active} onChange={() => setStatus(FleaItemStatus.Active)} />
                                    公開する
                                </label>
                                <label className={`cursor-pointer border rounded-lg px-4 py-2 text-sm font-bold ${status === FleaItemStatus.Draft ? "bg-gray-600 text-white" : "bg-white"}`}>
                                    <input type="radio" className="hidden" checked={status === FleaItemStatus.Draft} onChange={() => setStatus(FleaItemStatus.Draft)} />
                                    下書き
                                </label>
                            </div>
                        </section>

                        {/* 配送・価格セクション */}
                        <ShippingPriceSection
                            formState={formState}
                            setters={setters}
                            calc={calc}
                            errors={errors}
                        />
                    </>
                )}

                {/* 詳細情報画面 */}
                {currentStep === "details" && (
                    <DetailsSection
                        type={type}
                        liveDetails={liveDetails}
                        supplyDetails={supplyDetails}
                        setLiveDetails={setLiveDetails}
                        setSupplyDetails={setSupplyDetails}
                    />
                )}
            </main>

            <div className="h-24" />

            {/* フッターアクション */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
                <div className="max-w-lg mx-auto flex gap-3">
                    <button
                        onClick={() => setCurrentStep("main")}
                        className="flex-1 bg-gray-100 text-gray-700 font-bold h-12 rounded-lg disabled:opacity-30"
                        disabled={currentStep === "main"}
                    >
                        戻る
                    </button>

                    {currentStep === "main" ? (
                        <button
                            onClick={() => setCurrentStep("details")}
                            className="flex-[2] bg-gray-800 text-white font-bold h-12 rounded-lg hover:bg-gray-700"
                        >
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

            {/* モーダル */}
            <AddImagesModal
                open={addOpen}
                initialImages={images}
                onClose={() => setAddOpen(false)}
                onSave={handleAddImages}
            />
        </div>
    );
};

export default FleaItemEdit;