import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";

import api from "../../conf/api";
import { useToast } from "../../conf/function";
import { FleaItemStatus } from "../../conf/FleaMarket";

// ✅ 重複していた定数を feeConstants から import
import {
  FEE_BASE,
  FEE_PER_PLUS_PCT,
  FEE_MAX,
  MIN_PLUS_PCT,
  MAX_PLUS_PCT,
  STEP_PLUS_PCT,
} from "../../conf/feeConstants";

import { ImageAsset } from "../../types/FleaMarket";
import { ItemType } from "../../types/Market";
import {
  LiveDetails,
  SupplyDetails,
  FormState,
  FormSetters,
  FormCalculations,
  CategorySearchResult,
} from "../../types/FleaMarketForm";

import { ImageSection } from "../../steps/ImageSection";
import { BasicInfoSection } from "../../steps/BasicInfoSection";
import { ShippingPriceSection } from "../../steps/ShippingPriceSection";
import { DetailsSection } from "../../steps/DetailsSection";
import AddImagesModal from "../../modal/AddImagesModal";

const FleaItemEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<"main" | "details">("main");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [isMultiPurchasable, setIsMultiPurchasable] = useState(false);
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ItemType>("ANIMAL");
  const [mainIndex, setMainIndex] = useState<number>(0);
  const [status, setStatus] = useState<number>(FleaItemStatus.Active);

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [supplyTypeId, setSupplyTypeId] = useState<number | null>(null);

  const [shippingFeeType, setShippingFeeType] = useState<0 | 1 | 2>(0);
  const [shipFromId, setShipFromId] = useState<number | null>(null);
  const [shipsWithinDays, setShipsWithinDays] = useState<number | "">(2);
  const [sellerPlusPct, setSellerPlusPct] = useState<number>(0);

  const [liveDetails, setLiveDetails] = useState<LiveDetails>({
    locality: "", hatch_date: "", generation: "",
    size_value: 0, size_unit: "mm", size_mm: null, sex: "unknown",
  });
  const [supplyDetails, setSupplyDetails] = useState<SupplyDetails>({
    kind: "SUPPLY", brand: "", sku: "", net_weight_g: "",
    supply_type_id: null, target_category_id: null, target_category_name: "",
  });
  const [images, setImages] = useState<ImageAsset[]>([]);

  // ===== 手数料計算 =====
  const feeRate = Math.min(
    FEE_MAX,
    FEE_BASE + Math.max(MIN_PLUS_PCT, Math.min(MAX_PLUS_PCT, Math.floor(sellerPlusPct))) * FEE_PER_PLUS_PCT,
  );
  const feeYen = Math.floor((Number(price) || 0) * feeRate);
  const payoutYen = Math.max(0, Math.floor((Number(price) || 0) - feeYen));
  const sellerPlusPctOptions = useMemo(
    () => Array.from(
      { length: Math.round((MAX_PLUS_PCT - MIN_PLUS_PCT) / STEP_PLUS_PCT) + 1 },
      (_, i) => MIN_PLUS_PCT + STEP_PLUS_PCT * i,
    ),
    [],
  );

  // ===== バリデーション =====
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "商品名を入力してください";
    const p = Number(price);
    if (!price || isNaN(p) || p <= 0) e.price = "価格は1以上の数値で入力してください";
    if (!isMultiPurchasable && quantity !== 1) e.quantity = "単品出品では数量は1固定です";
    if (quantity < 1) e.quantity = "数量は1以上";
    if (images.length === 0) e.images = "商品画像を1枚以上追加してください";
    if (shipFromId === null) e.shipFrom = "発送元を選択してください";
    if (shipsWithinDays === "") e.shipsWithinDays = "発送目安を選択してください";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ===== データ取得 =====
  useEffect(() => {
    if (!id) return;
    const fetchItem = async () => {
      try {
        const res = await api.get(`/flea-market/item/${id}`);
        const { item, images: apiImages } = res.data;
        if (!item) throw new Error("商品データがありません");

        setName(item.name || "");
        setPrice(item.price || "");
        setQuantity(item.quantity || 1);
        setIsMultiPurchasable(item.is_multi_purchasable ?? item.quantity > 1);
        setDescription(item.description ?? "");
        setType(item.type || "ANIMAL");
        setStatus(item.status ?? FleaItemStatus.Active);
        setCategoryId(item.category_id ?? null);
        setCategoryName(item.category_name ?? null);
        setSupplyTypeId(item.supply_type_id ?? null);
        setShippingFeeType(item.shipping_fee_type ?? 0);
        setShipFromId(item.ship_from_id ?? null);
        setShipsWithinDays(item.ships_within_days ?? 2);
        setSellerPlusPct(item.seller_plus_pct ?? 0);
        if (item.live_details)   setLiveDetails(item.live_details);
        if (item.supply_details) setSupplyDetails(item.supply_details);

        if (Array.isArray(apiImages)) {
          setImages(apiImages.map((img: { id: number; url: string }) => ({
            id: String(img.id), url: img.url, serverId: img.id,
          })));
        }
      } catch (err) {
        console.error("商品取得エラー:", err);
        toast({ text: "商品情報の取得に失敗しました", kind: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id, toast]);

  // ===== カテゴリ選択 =====
  const handleCategorySelect = (item: CategorySearchResult) => {
    setCategoryName(item.full_path_name || item.name);
    if (item.is_supply || item.type === "supply") {
      setType("SUPPLY" as ItemType);
      setCategoryId(item.parent_id || item.category_id || 0);
      setSupplyTypeId(item.supply_type_id || item.id);
    } else {
      const targetType = (item.built_in_type as ItemType) || "INSECT";
      setType(targetType);
      setCategoryId(item.id);
      setSupplyTypeId(0);
    }
  };

  // ===== 保存 =====
  const handleSubmit = async () => {
    if (submitting || !validate()) { setCurrentStep("main"); return; }
    if (!name || !price || images.length === 0) {
      toast({ text: "必須項目が不足しています", kind: "error" }); return;
    }
    if (!confirm("変更を保存しますか？")) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      fd.append("price", String(price));
      fd.append("quantity", String(isMultiPurchasable ? quantity : 1));
      fd.append("is_multi_purchasable", isMultiPurchasable ? "1" : "0");
      fd.append("type", type);
      fd.append("shipping_fee_type", String(shippingFeeType));
      fd.append("seller_plus_pct", String(sellerPlusPct));
      fd.append("status", String(status));
      if (categoryId)           fd.append("category_id", String(categoryId));
      if (categoryName)         fd.append("category_name", categoryName);
      if (supplyTypeId)         fd.append("supply_type_id", String(supplyTypeId));
      if (shipFromId)           fd.append("ship_from_id", String(shipFromId));
      if (shipsWithinDays !== "") fd.append("ships_within_days", String(shipsWithinDays));

      const keptIds: number[] = [];
      const sortOrder = images.map((img, i) => {
        if (img.serverId) { keptIds.push(img.serverId); return { type: "existing", id: img.serverId, index: i }; }
        if (img.file) fd.append("new_images", img.file, img.file.name || `image_${i}.jpg`);
        return { type: "new", id: 0, index: i };
      });
      fd.append("kept_image_ids", JSON.stringify(keptIds));
      fd.append("sort_order", JSON.stringify(sortOrder));

      await api.post(`/flea-market/item/edit/${id}`, fd, { headers: { "Content-Type": undefined } });
      toast({ text: "変更を保存しました", kind: "success" });
      navigate(`/flea-market/item/${id}`);
    } catch (err) {
      console.error("保存エラー:", err);
      toast({ text: "保存に失敗しました", kind: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // ===== FormState / Setters / Calc =====
  const formState: FormState = {
    name, price, sellerPlusPct, quantity, isMultiPurchasable, type,
    categoryId, supplyTypeId, categoryName, description, shippingFeeType,
    shipFromId, shipsWithinDays, images, mainIndex, liveDetails, supplyDetails,
  };
  // ✅ setCategoryName は string | null → FormSetters の型定義に合わせてそのまま渡す
  const setters: FormSetters = {
    setName, setPrice, setSellerPlusPct, setQuantity, setIsMultiPurchasable,
    setType, setCategoryId, setSupplyTypeId, setCategoryName, setDescription,
    setShippingFeeType, setShipFromId, setShipsWithinDays, setImages,
    setMainIndex, setLiveDetails, setSupplyDetails, setCurrentStep,
  };
  const calc: FormCalculations = { feeRate, feeYen, payoutYen, sellerPlusPctOptions };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-gray-400" size={40} />
      </div>
    );
  }

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
        <div className="max-w-lg mx-auto px-4 h-1 flex w-full">
          <div className={`h-full transition-all duration-300 ${currentStep === "main" ? "w-1/2 bg-blue-600" : "w-full bg-green-500"}`} />
          <div className="h-full w-full bg-gray-200" />
        </div>
      </div>

      <main className="max-w-xl mx-auto pt-6 px-4 space-y-6">
        {currentStep === "main" && (
          <>
            {/* ✅ ImageSection の props は元の定義通り */}
            <ImageSection
              images={images}
              onChange={setImages}
              onOpenAdd={() => setAddOpen(true)}
              error={errors.images}
            />
            <BasicInfoSection
              formState={formState}
              setters={setters}
              errors={errors}
              onCategorySelect={handleCategorySelect}
            />

            {/* 公開設定 */}
            <section className="bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold mb-4 pb-2 border-b border-gray-100">公開設定</h2>
              <div className="flex gap-2">
                {[
                  { label: "公開する",   value: FleaItemStatus.Active },
                  { label: "下書き保存", value: FleaItemStatus.Draft },
                ].map((opt) => (
                  <label key={opt.value} className={`cursor-pointer border rounded-lg px-4 py-2 text-sm font-bold ${status === opt.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600"}`}>
                    <input type="radio" className="hidden" checked={status === opt.value} onChange={() => setStatus(opt.value)} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </section>

            <ShippingPriceSection formState={formState} setters={setters} calc={calc} errors={errors} />
          </>
        )}

        {currentStep === "details" && (
          // ✅ DetailsSection の props は元の定義通り
          <DetailsSection
            type={formState.type}
            liveDetails={formState.liveDetails}
            supplyDetails={formState.supplyDetails}
            setLiveDetails={setters.setLiveDetails}
            setSupplyDetails={setters.setSupplyDetails}
          />
        )}
      </main>

      {/* フッター */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={() => setCurrentStep(currentStep === "details" ? "main" : "details")}
            className="flex-1 bg-gray-100 text-gray-700 font-bold h-12 rounded-lg hover:bg-gray-200"
          >
            {currentStep === "main" ? "詳細設定へ" : "基本情報へ戻る"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`flex-[2] font-bold h-12 rounded-lg text-white transition-colors ${submitting ? "bg-gray-400 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 shadow-md"}`}
          >
            {submitting ? <><Loader2 className="animate-spin inline mr-2" size={16} />保存中...</> : "変更を保存する"}
          </button>
        </div>
      </div>

      <AddImagesModal
        open={addOpen}
        initialImages={images}
        onClose={() => setAddOpen(false)}
        onSave={(imgs) => { setImages(imgs); setAddOpen(false); }}
      />
    </div>
  );
};

export default FleaItemEdit;