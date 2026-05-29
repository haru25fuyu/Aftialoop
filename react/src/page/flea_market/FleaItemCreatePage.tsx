import { useState } from "react";

import { useFleaItemForm } from "../../hooks/useFleaItemForm";

import { ItemType } from "../../types/Market";
// ✅ 同じモジュールから2行に分かれていた import を1行に統一
import { AnyDetails, CategorySearchResult, PublishSummary } from "../../types/FleaMarketForm";

import { HeaderArea } from "../../component/FleaMarket/CreateItemHeaderArea";
import { FooterActions } from "../../component/FleaMarket/CreateItemFooterAvtion";
import { ImageSection } from "../../steps/ImageSection";
import { BasicInfoSection } from "../../steps/BasicInfoSection";
import { ShippingPriceSection } from "../../steps/ShippingPriceSection";
import { DetailsSection } from "../../steps/DetailsSection";

import { ConfirmDialog } from "../../modal/ConfirmDialog";
import { PublishCompleteDialog } from "../../modal/PublishCompleteDialog";
import AddImagesModal from "../../modal/AddImagesModal";
import TinySavedPopup from "../../component/TinySavedPopup";

export default function FleaItemCreatePage() {
  const { formState, systemState, calc, setters, actions } = useFleaItemForm();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);

  // ✅ 重複コメントを1つに整理。View側でカテゴリ選択後の副作用を担当するハンドラ
  const handleCategorySelect = (item: CategorySearchResult) => {
    setters.setCategoryName(item.full_path_name || item.name);
    if (item.is_supply || item.type === "supply") {
      setters.setType("SUPPLY" as ItemType);
      setters.setCategoryId(item.parent_id || item.category_id || 0);
      setters.setSupplyTypeId(item.supply_type_id || item.id);
    } else {
      const targetType = (item.built_in_type as ItemType) || "INSECT";
      setters.setType(targetType);
      setters.setCategoryId(item.id);
      setters.setSupplyTypeId(0);
    }
  };

  // 表示用にデータを変換する関数
  const getFormattedDetails = (): AnyDetails => {
    if (formState.type === "SUPPLY") return formState.supplyDetails;
    const d = formState.liveDetails;
    switch (formState.type) {
      case "REPTILE":
      case "AMPHIBIAN":
        return { kind: formState.type, morph: d.locality, birth_date: d.hatch_date, lineage: d.generation, size_value: d.size_value, size_unit: d.size_unit, size_mm: d.size_mm, sex: d.sex };
      case "MAMMAL":
        return { kind: "MAMMAL", origin: d.locality, birth_date: d.hatch_date, lineage: d.generation, size_value: d.size_value, size_unit: d.size_unit, size_mm: d.size_mm, sex: d.sex };
      case "FISH":
        return { kind: "FISH", origin: d.locality, arrival_date: d.hatch_date, generation: d.generation, size_value: d.size_value, size_unit: d.size_unit, size_mm: d.size_mm, sex: d.sex };
      default:
        return { kind: "INSECT", locality: d.locality, hatch_date: d.hatch_date, generation: d.generation, size_value: d.size_value, size_unit: d.size_unit, size_mm: d.size_mm, sex: d.sex };
    }
  };

  const summaryData: PublishSummary = {
    name: formState.name,
    price: Number(formState.price) || 0,
    seller_plus_pct: formState.sellerPlusPct,
    quantity: formState.isMultiPurchasable ? formState.quantity : 1,
    total: (Number(formState.price) || 0) * (formState.isMultiPurchasable ? formState.quantity : 1),
    isMultiPurchasable: formState.isMultiPurchasable,
    type: formState.type,
    description: formState.description,
    shippingFeeType: formState.shippingFeeType,
    shipFromId: formState.shipFromId || undefined,
    shipsWithinDays: formState.shipsWithinDays === "" ? undefined : Number(formState.shipsWithinDays),
    mainIndex: formState.mainIndex,
    category_name: formState.categoryName,
    details: getFormattedDetails(),
    images: formState.images,
  };

  const handlePublishClick = () => {
    if (!actions.validate()) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setConfirmOpen(true);
  };

  const handleConfirmPublish = async () => {
    const success = await actions.doSubmit();
    if (success) { setConfirmOpen(false); setCompleteOpen(true); }
  };

  const handleAutoSave = async () => {
    await actions.autosaveNow();
    setSavedOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-32">
      {/* ✅ HeaderArea の props は元のコンポーネント定義に合わせる */}
      <HeaderArea
        draftId={systemState.draftId}
        saving={systemState.saving}
        lastSavedAt={systemState.lastSavedAt}
        onSave={handleAutoSave}
        onReset={actions.resetForm}
      />

      <div className="sticky top-14 z-30 bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 h-1 flex w-full">
          <div className={`h-full transition-all duration-300 ${systemState.currentStep === "main" ? "w-1/2 bg-blue-600" : "w-full bg-green-500"}`} />
          <div className="h-full w-full bg-gray-200" />
        </div>
      </div>

      <main className="max-w-xl mx-auto pt-6 px-4 space-y-6">
        {systemState.currentStep === "main" && (
          <>
            {/* ✅ ImageSection の props は元の定義通り */}
            <ImageSection
              images={formState.images}
              onChange={setters.setImages}
              onOpenAdd={() => setAddOpen(true)}
              error={systemState.errors.images}
            />
            <BasicInfoSection
              formState={formState}
              setters={setters}
              errors={systemState.errors}
              onCategorySelect={handleCategorySelect}
            />
            <ShippingPriceSection
              formState={formState}
              setters={setters}
              calc={calc}
              errors={systemState.errors}
            />
          </>
        )}

        {systemState.currentStep === "details" && (
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

      {/* ✅ FooterActions の props は元の定義通り */}
      <FooterActions
        currentStep={systemState.currentStep}
        onPrev={() => setters.setCurrentStep("main")}
        onNext={() => {
          if (actions.validate()) { setters.setCurrentStep("details"); window.scrollTo({ top: 0, behavior: "smooth" }); }
          else { window.scrollTo({ top: 0, behavior: "smooth" }); }
        }}
        onPublish={handlePublishClick}
        canPublish={true}
        submitting={systemState.submitting}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmPublish}
        submitting={systemState.submitting}
        summary={summaryData}
      />
      <AddImagesModal
        open={addOpen}
        initialImages={formState.images}
        onClose={() => setAddOpen(false)}
        onSave={(imgs) => { actions.handleAddImages(imgs); setAddOpen(false); }}
      />
      <PublishCompleteDialog
        open={completeOpen}
        itemId={systemState.lastItemId}
        onClose={() => setCompleteOpen(false)}
        onContinue={() => { setCompleteOpen(false); actions.resetForm(); }}
      />
      <TinySavedPopup open={savedOpen} onClose={() => setSavedOpen(false)} />
    </div>
  );
}