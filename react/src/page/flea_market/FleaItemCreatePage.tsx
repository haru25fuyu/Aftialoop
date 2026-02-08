import { useState } from "react";
import { useFleaItemForm } from "../../hooks/useFleaItemForm";
import { useToast } from "../../conf/function";
import { ItemType } from "../../types/Market";
import { CategorySearchResult, PublishSummary } from "../../types/FleaMarketForm";

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

        if (item.built_in_type) {
            setters.setType(item.built_in_type as ItemType);
        } else {
            // ★修正: データがない場合に勝手に INSECT にしない！
            // ログを出して、開発者に気づかせる（本番では消してもOK）
            console.warn(`カテゴリー「${item.name}」には built_in_type が設定されていません。`);

            // 何もしない（ユーザーが手動で変えるのを待つ）か、
            // 名前から推測するロジックを入れる（プードルならMAMMALなど）
            if (item.name.includes("プードル") || item.name.includes("犬") || item.name.includes("猫")) {
                setters.setType("MAMMAL");
            } else {
                // 本当にわからなければデフォルト（INSECT）でもいいが、
                // ユーザーが「爬虫類」を選んでいたのに勝手に「昆虫」に戻るのはストレスなので
                // ここでは「何もしない（setTypeを呼ばない）」のが安全です。
            }
        }

        setters.setLiveDetails((prev) => ({
            ...prev,
            category_id: item.id,
            category_name: item.name
        }));

        toast({ text: `「${item.name}」を設定しました`, kind: "success" });
    };

    const summaryData: PublishSummary = {
        name: formState.name,
        description: formState.description,

        // 型変換: string -> number
        price: Number(formState.price) || 0,

        // キー名変換: sellerPlusPct -> seller_plus_pct
        seller_plus_pct: formState.sellerPlusPct,

        quantity: formState.quantity,
        isMultiPurchasable: formState.isMultiPurchasable,
        type: formState.type,
        shippingFeeType: formState.shippingFeeType,

        // undefined考慮
        shipFromId: formState.shipFromId || undefined,
        shipsWithinDays: formState.shipsWithinDays === "" ? undefined : Number(formState.shipsWithinDays),

        images: formState.images,
        mainIndex: formState.mainIndex,

        // 詳細情報の統合
        details: formState.type !== "SUPPLY" ? formState.liveDetails : formState.supplyDetails,

        // 合計金額の計算
        total: (Number(formState.price) || 0) * (formState.isMultiPurchasable ? formState.quantity : 1),
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
                            supplyTypes={systemState.supplyTypes || []} // Hook側でreturnに追加する必要あり
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