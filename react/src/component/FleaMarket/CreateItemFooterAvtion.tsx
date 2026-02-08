
type FooterActionsProps = {
    currentStep: "main" | "details";
    onPrev: () => void;
    onNext: () => void;
    onPublish: () => void;
    canPublish: boolean;
    submitting: boolean;
};

export function FooterActions({ currentStep, onPrev, onNext, onPublish, canPublish, submitting }: FooterActionsProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
            <div className="max-w-lg mx-auto flex gap-3">
                <button
                    onClick={onPrev}
                    disabled={currentStep === "main"}
                    className="flex-1 bg-gray-100 text-gray-700 font-bold h-12 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200"
                >
                    戻る
                </button>

                {currentStep === "main" ? (
                    <button
                        onClick={onNext}
                        className="flex-[2] bg-gray-800 text-white font-bold h-12 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        次へ（詳細設定）
                    </button>
                ) : null}

                <button
                    onClick={onPublish}
                    disabled={!canPublish || submitting}
                    className={`flex-[2] font-bold h-12 rounded-lg transition-colors text-white ${!canPublish || submitting
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-red-500 hover:bg-red-600 shadow-md"
                        }`}
                >
                    {submitting ? "出品中..." : "出品する"}
                </button>
            </div>
        </div>
    );
}