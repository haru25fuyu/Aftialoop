import { useState } from "react";
import { useFleaItemForm } from "../../hooks/useFleaItemForm";
import { ItemType } from "../../types/Market";
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

import { s } from "../../styles/page/flea_market/FleaItemCreatePage.styles";

export default function FleaItemCreatePage() {
  const { formState, systemState, calc, setters, actions } = useFleaItemForm();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);

  const handleCategorySelect = (item: CategorySearchResult) => {
    setters.setCategoryName(item.full_path_name || item.name);
    if (item.is_supply || item.type === "supply") {
      setters.setType("SUPPLY" as ItemType); setters.setCategoryId(item.parent_id || item.category_id || 0); setters.setSupplyTypeId(item.supply_type_id || item.id);
    } else {
      const targetType = (item.built_in_type as ItemType) || "INSECT";
      setters.setType(targetType); setters.setCategoryId(item.id); setters.setSupplyTypeId(0);
    }
  };

  const getFormattedDetails = (): AnyDetails => {
    if (formState.type === "SUPPLY") return formState.supplyDetails;
    // LiveDetails → InsectDetails として kind を付与して返す
    const d = formState.liveDetails;
    return {
      kind: formState.type as "INSECT",
      locality: d.locality,
      hatch_date: d.hatch_date,
      generation: d.generation,
      size_value: d.size_value,
      size_unit: d.size_unit,
      size_mm: d.size_mm,
      sex: d.sex,
    } as AnyDetails;
  };

  const summaryData: PublishSummary = {
    name: formState.name,
    price: Number(formState.price),
    quantity: formState.quantity,
    isMultiPurchasable: formState.isMultiPurchasable,
    description: formState.description,
    type: formState.type,
    category_name: formState.categoryName || "",
    shippingFeeType: formState.shippingFeeType,
    shipFromId: formState.shipFromId ?? undefined,
    shipsWithinDays: formState.shipsWithinDays !== "" ? formState.shipsWithinDays : undefined,
    seller_plus_pct: formState.sellerPlusPct,
    total: Number(formState.price),
    images: formState.images,
    mainIndex: formState.mainIndex,
    details: getFormattedDetails(),
  };

  const handlePublishClick = () => { if (actions.validate()) setConfirmOpen(true); };
  const handleConfirmPublish = async () => {
    const success = await actions.doSubmit();
    if (success) { setConfirmOpen(false); setCompleteOpen(true); }
  };

  return (
    <div style={s.page}>
      <HeaderArea draftId={systemState.draftId} saving={systemState.saving} lastSavedAt={systemState.lastSavedAt} onSave={actions.autosaveNow} onReset={actions.resetForm} />

      {/* プログレスバー */}
      <div style={s.stickyHeader}>
        <div style={s.progressTrack}>
          <div style={s.progressHalf(systemState.currentStep === "main")} />
          <div style={s.progressHalf(systemState.currentStep === "details")} />
        </div>
      </div>

      <main style={s.main}>
        {systemState.currentStep === "main" && (
          <>
            <ImageSection images={formState.images} onChange={setters.setImages} onOpenAdd={() => setAddOpen(true)} error={systemState.errors.images} />
            <BasicInfoSection formState={formState} setters={setters} errors={systemState.errors} onCategorySelect={handleCategorySelect} />
            <ShippingPriceSection formState={formState} setters={setters} calc={calc} errors={systemState.errors} />
          </>
        )}
        {systemState.currentStep === "details" && (
          <DetailsSection type={formState.type} liveDetails={formState.liveDetails} supplyDetails={formState.supplyDetails} setLiveDetails={setters.setLiveDetails} setSupplyDetails={setters.setSupplyDetails} />
        )}
      </main>

      <FooterActions currentStep={systemState.currentStep} onPrev={() => setters.setCurrentStep("main")} onNext={() => { if (actions.validate()) { setters.setCurrentStep("details"); window.scrollTo({ top: 0, behavior: "smooth" }); } else { window.scrollTo({ top: 0, behavior: "smooth" }); } }} onPublish={handlePublishClick} canPublish={true} submitting={systemState.submitting} />

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmPublish} submitting={systemState.submitting} summary={summaryData} />
      <AddImagesModal open={addOpen} initialImages={formState.images} onClose={() => setAddOpen(false)} onSave={(imgs) => { actions.handleAddImages(imgs); setAddOpen(false); }} />
      <PublishCompleteDialog open={completeOpen} itemId={systemState.lastItemId} onClose={() => setCompleteOpen(false)} onContinue={() => { setCompleteOpen(false); actions.resetForm(); }} />
      <TinySavedPopup open={savedOpen} onClose={() => setSavedOpen(false)} />
    </div>
  );
}