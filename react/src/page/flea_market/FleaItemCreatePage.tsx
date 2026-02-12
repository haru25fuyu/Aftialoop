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

import { AnyDetails } from "../../types/FleaMarketForm";
import { CategorySearchResult } from "../../types/FleaMarketForm";


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
    // カテゴリー選択時のハンドラ
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

    // 表示用にデータを変換する関数
    const getFormattedDetails = () => {
        if (formState.type === "SUPPLY") {
            return formState.supplyDetails;
        }

        // 共通の入力値
        const d = formState.liveDetails;

        // カテゴリーに合わせてキー名を変換 (buildPayloadと同じロジック)
        switch (formState.type) {
            case "REPTILE":
            case "AMPHIBIAN":
                return {
                    kind: formState.type,
                    morph: d.locality,       // locality -> morph
                    birth_date: d.hatch_date,// hatch_date -> birth_date
                    lineage: d.generation,   // generation -> lineage
                    size: d.size,
                    sex: d.sex
                };
            case "PLANT_ORNAMENTAL":
            case "PLANT_FOOD":
                return {
                    kind: "PLANT",
                    origin: d.locality,           // locality -> origin
                    acquisition_date: d.hatch_date, // hatch_date -> acquisition_date
                    propagation: d.generation,    // generation -> propagation
                    size: d.size
                    // sexなし
                };
            case "MAMMAL":
                return {
                    kind: "MAMMAL",
                    origin: d.locality,
                    birth_date: d.hatch_date,
                    lineage: d.generation,
                    size: d.size,
                    sex: d.sex
                };
            case "FISH":
                return {
                    kind: "FISH",
                    origin: d.locality,
                    arrival_date: d.hatch_date,
                    generation: d.generation,
                    size: d.size,
                    sex: d.sex
                };
            case "INSECT":
            default:
                // 昆虫はそのまま (LiveDetailsとキー名がほぼ同じ)
                return {
                    kind: "INSECT",
                    locality: d.locality,
                    hatch_date: d.hatch_date,
                    generation: d.generation,
                    size: d.size,
                    sex: d.sex
                };
        }
    };

    // Summary作成 (Dialog用)
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

        category_name: formState.categoryName, // カテゴリー名

        // ここで変換関数を呼ぶ！
        details: getFormattedDetails() as AnyDetails, // 型合わせ (AnyDetails)

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
                // ▼ 修正: 単なるstateセットではなく、アップロード処理(handleAddImages)を呼ぶ
                onSave={(imgs) => {
                    actions.handleAddImages(imgs);
                    setAddOpen(false);
                }}
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