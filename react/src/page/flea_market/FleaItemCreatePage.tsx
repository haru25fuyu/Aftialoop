import React, { useState } from "react";
import { useFleaItemForm } from "../../hooks/useFleaItemForm";
import { useToast } from "../../conf/function";
import { ItemType } from "../../types/Market";
import { PublishSummary } from "../../types/FleaMarketForm";

// コンポーネント群のインポート
import { HeaderArea } from "../../component/FleaMarket/CreateItemHeaderArea";
import { FooterActions } from "../../component/FleaMarket/CreateItemFooterAvtion";
import { ImageSection } from "../../steps/ImageSection";
import { BasicInfoSection } from "../../steps/BasicInfoSection";
import { ShippingPriceSection } from "../../steps/ShippingPriceSection";
import { DetailsSection } from "../../steps/DetailsSection";

// モーダル群
import { ConfirmDialog } from "../../modal/ConfirmDialog";
import { PublishCompleteDialog } from "../../modal/PublishCompleteDialog";
import AddImagesModal from "../../modal/AddImagesModal";
import TinySavedPopup from "../../component/TinySavedPopup";

type CategorySearchResult = {
    id: number;
    name: string;
    built_in_type?: string;
};

export default function FleaItemCreatePage() {
    const toast = useToast();
    const { formState, systemState, calc, setters, actions } = useFleaItemForm();

    // UI制御用ローカルステート
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [completeOpen, setCompleteOpen] = useState(false);
    const [savedOpen, setSavedOpen] = useState(false);

    // カテゴリー選択時のハンドラ
    // (Hookから切り離しておいて、View側の都合でtoastを出したりする)
    const handleCategorySelect = (item: CategorySearchResult) => {
        setters.setName(item.name);

        // item.built_in_type があれば型キャストしてセット
        if (item.built_in_type) {
            setters.setType(item.built_in_type as ItemType);
        } else {
            setters.setType("INSECT");
        }

        // ▼ 修正: prev は自動推論されるので、(prev: any) ではなく (prev) でOK
        setters.setLiveDetails((prev) => ({
            ...prev,
            category_id: item.id,
            category_name: item.name
        }));

        toast({ text: `「${item.name}」を設定しました`, kind: "success" });
    };

    const summaryData: PublishSummary = {
        name: formState.name    ,
        price: Number(formState.price) || 0,
        seller_plus_pct: formState.sellerPlusPct,
        quantity: formState.isMultiPurchasable ? formState.quantity : 1,
        total: (Number(formState.price) || 0) * (formState.isMultiPurchasable ? formState.quantity : 1),
        isMultiPurchasable: formState.isMultiPurchasable,
        type: formState.type,
        description: formState.description,
        shippingFeeType: formState.shippingFeeType,
        shipFromId: formState.shipFromId || null,
        shipsWithinDays: formState.shipsWithinDays === "" ? undefined : Number(formState.shipsWithinDays),
        mainIndex: formState.mainIndex,
        details: formState.type === "ANIMAL" ? formState.liveDetails : formState.supplyDetails,
        images: formState.images,
    };

    const handlePublishClick = () => {
        if (!actions.validate()) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        setConfirmOpen(true);
    };

    const handleConfirmPublish = async () => {
        const success = await actions.doSubmit();
        if (success) {
            setConfirmOpen(false);
            setCompleteOpen(true);
        }
    };

    const handleAutoSave = async () => {
        await actions.autosaveNow();
        setSavedOpen(true);
    };

    return (
        <div className="min-h-screen bg-[#f8f9fa] pb-32">
            <HeaderArea
                draftId={systemState.draftId}
                saving={systemState.saving}
                lastSavedAt={systemState.lastSavedAt}
                onSave={handleAutoSave}
                onReset={actions.resetForm}
            />

            {/* ステッパー (必要ならコンポーネント化、ここでは簡易的に配置) */}
            <div className="sticky top-14 z-30 bg-white border-b border-gray-200">
                <div className="max-w-lg mx-auto px-4 h-1 flex w-full">
                    <div className={`h-full transition-all duration-300 ${systemState.currentStep === 'main' ? 'w-1/2 bg-blue-600' : 'w-full bg-green-500'}`} />
                    <div className="h-full w-full bg-gray-200" />
                </div>
            </div>

            <main className="max-w-xl mx-auto pt-6 px-4 space-y-6">
                {systemState.currentStep === "main" && (
                    <>
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
                            supplyTypes={systemState.supplyTypes || []}
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
                    <DetailsSection
                        type={formState.type}
                        liveDetails={formState.liveDetails}
                        supplyDetails={formState.supplyDetails}
                        setLiveDetails={setters.setLiveDetails}
                        setSupplyDetails={setters.setSupplyDetails}
                    />
                )}
            </main>

            <FooterActions
                currentStep={systemState.currentStep}
                onPrev={() => setters.setCurrentStep("main")}
                onNext={() => {
                    if (actions.validate()) {
                        setters.setCurrentStep("details");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    } else {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                }}
                onPublish={handlePublishClick}
                canPublish={true}
                submitting={systemState.submitting}
            />

            {/* Modals */}
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
                onSave={(imgs) => { setters.setImages(imgs); setAddOpen(false); }}
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