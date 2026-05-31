import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";

import api from "../../conf/api";
import { useToast } from "../../conf/function";
import { FleaItemStatus } from "../../conf/FleaMarket";
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

import { s } from "../../styles/page/flea_market/FleaItemEdit.styles";

const FleaItemEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<"main" | "details">("main");
  const errors: Record<string, string> = {};

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
    locality: "",
    hatch_date: "",
    generation: "",
    size_value: 0,
    size_unit: "mm",
    size_mm: null,
    sex: "unknown",
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
  const [images, setImages] = useState<ImageAsset[]>([]);

  const feeRate = Math.min(
    FEE_MAX,
    FEE_BASE +
      Math.max(MIN_PLUS_PCT, Math.min(MAX_PLUS_PCT, sellerPlusPct)) *
        FEE_PER_PLUS_PCT,
  );
  const feeYen = Math.ceil((Number(price) || 0) * feeRate);
  const payoutYen = (Number(price) || 0) - feeYen;
  const sellerPlusPctOptions = Array.from(
    { length: (MAX_PLUS_PCT - MIN_PLUS_PCT) / STEP_PLUS_PCT + 1 },
    (_, i) => MIN_PLUS_PCT + i * STEP_PLUS_PCT,
  );

  const formState: FormState = {
    name,
    price,
    quantity,
    isMultiPurchasable,
    description,
    type,
    mainIndex,
    categoryId,
    categoryName,
    supplyTypeId,
    shippingFeeType,
    shipFromId,
    shipsWithinDays,
    sellerPlusPct,
    liveDetails,
    supplyDetails,
    images,
  };
  const setters: FormSetters = {
    setName,
    setPrice,
    setQuantity,
    setIsMultiPurchasable,
    setDescription,
    setType,
    setMainIndex,
    setCategoryId,
    setCategoryName,
    setSupplyTypeId,
    setShippingFeeType,
    setShipFromId,
    setShipsWithinDays,
    setSellerPlusPct,
    setLiveDetails,
    setSupplyDetails,
    setImages,
    setCurrentStep,
  };
  const calc: FormCalculations = {
    feeRate,
    feeYen,
    payoutYen,
    sellerPlusPctOptions,
  };

  useEffect(() => {
    if (!id) return;
    api
      .get(`/flea-market/item/${id}/edit`)
      .then((res) => {
        const item = res.data.item;
        setName(item.name || "");
        setPrice(String(item.price || ""));
        setQuantity(item.quantity || 1);
        setIsMultiPurchasable(!!item.is_multi_purchasable);
        setDescription(item.description || "");
        setType((item.type as ItemType) || "ANIMAL");
        setStatus(item.status ?? FleaItemStatus.Active);
        setCategoryId(item.category_id || null);
        setCategoryName(item.category_name || null);
        setSupplyTypeId(item.supply_type_id || null);
        setShippingFeeType(item.shipping_fee_type ?? 0);
        setShipFromId(item.ship_from_id || null);
        setShipsWithinDays(item.ships_within_days || 2);
        setSellerPlusPct(item.seller_plus_pct || 0);
        setImages(
          res.data.images?.map((img: { id: number; url: string }) => ({
            id: String(img.id),
            url: img.url,
            serverId: img.id,
          })) || [],
        );
        if (item.details) {
          if (item.type === "SUPPLY") setSupplyDetails(item.details);
          else setLiveDetails(item.details);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleCategorySelect = (item: CategorySearchResult) => {
    setCategoryName(item.full_path_name || item.name);
    if (item.is_supply || item.type === "supply") {
      setType("SUPPLY" as ItemType);
      setCategoryId(item.parent_id || item.category_id || 0);
      setSupplyTypeId(item.supply_type_id || item.id);
    } else {
      const t = (item.built_in_type as ItemType) || "INSECT";
      setType(t);
      setCategoryId(item.id);
      setSupplyTypeId(0);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/flea-market/item/${id}/update`, {
        name,
        price: Number(price),
        quantity,
        is_multi_purchasable: isMultiPurchasable,
        description,
        type,
        status,
        category_id: categoryId,
        supply_type_id: supplyTypeId,
        shipping_fee_type: shippingFeeType,
        ship_from_id: shipFromId,
        ships_within_days: shipsWithinDays,
        seller_plus_pct: sellerPlusPct,
        main_index: mainIndex,
        images: images.map((img, i) => ({
          id: img.serverId,
          url: img.url,
          is_new: !!img.file,
          index: i,
        })),
        details: type === "SUPPLY" ? supplyDetails : liveDetails,
      });
      toast("変更を保存しました");
      navigate(`/flea-market/item/${id}`);
    } catch {
      console.error("保存失敗");
      toast("保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div style={s.loadingWrap}>
        <Loader2
          size={40}
          style={{ animation: "spin 0.7s linear infinite", color: "#8c8c8c" }}
        />
      </div>
    );

  return (
    <div style={s.page}>
      <div style={s.stickyHeader}>
        <div style={s.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: 4,
                background: "none",
                border: "none",
                cursor: "pointer",
                borderRadius: "50%",
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 style={s.title}>商品の編集</h1>
          </div>
        </div>
        <div style={s.progressTrack}>
          <div style={s.progressHalf(currentStep === "main")} />
          <div style={s.progressHalf(currentStep === "details")} />
        </div>
      </div>

      <main style={s.main}>
        {currentStep === "main" && (
          <>
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
            <section
              style={{
                backgroundColor: "#fff",
                padding: "20px 24px",
                borderRadius: 12,
                border: "1px solid #e0ddd8",
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 16,
                  paddingBottom: 8,
                  borderBottom: "1px solid #f0eeeb",
                }}
              >
                公開設定
              </h2>
              <div style={s.statusRow}>
                {[
                  { label: "公開する", value: FleaItemStatus.Active },
                  { label: "下書き保存", value: FleaItemStatus.Draft },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={s.statusBtn(status === opt.value)}
                  >
                    <input
                      type="radio"
                      style={{ display: "none" }}
                      checked={status === opt.value}
                      onChange={() => setStatus(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </section>
            <ShippingPriceSection
              formState={formState}
              setters={setters}
              calc={calc}
              errors={errors}
            />
          </>
        )}
        {currentStep === "details" && (
          <DetailsSection
            type={formState.type}
            liveDetails={formState.liveDetails}
            supplyDetails={formState.supplyDetails}
            setLiveDetails={setters.setLiveDetails}
            setSupplyDetails={setters.setSupplyDetails}
          />
        )}
      </main>

      <div style={s.footer}>
        <div style={s.footerInner}>
          <button
            onClick={() =>
              setCurrentStep(currentStep === "details" ? "main" : "details")
            }
            style={s.cancelBtn}
          >
            {currentStep === "main" ? "詳細設定へ" : "基本情報へ戻る"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              ...s.saveBtn,
              opacity: submitting ? 0.45 : 1,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? (
              <>
                <Loader2
                  size={16}
                  style={{
                    display: "inline",
                    marginRight: 8,
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                保存中...
              </>
            ) : (
              "変更を保存する"
            )}
          </button>
        </div>
      </div>

      <AddImagesModal
        open={addOpen}
        initialImages={images}
        onClose={() => setAddOpen(false)}
        onSave={(imgs) => {
          setImages(imgs);
          setAddOpen(false);
        }}
      />
    </div>
  );
};

export default FleaItemEdit;
