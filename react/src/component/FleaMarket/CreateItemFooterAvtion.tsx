import { s } from "../../styles/component/fleaMarket/CreateItemFooterAction.styles";

type Props = {
  currentStep: "main" | "details";
  onPrev: () => void;
  onNext: () => void;
  onPublish: () => void;
  canPublish: boolean;
  submitting: boolean;
};

export function FooterActions({
  currentStep,
  onPrev,
  onNext,
  onPublish,
  canPublish,
  submitting,
}: Props) {
  return (
    <div style={s.footer}>
      <div style={s.inner}>
        <button
          onClick={onPrev}
          disabled={currentStep === "main"}
          style={{
            ...s.prevBtn,
            opacity: currentStep === "main" ? 0.3 : 1,
            cursor: currentStep === "main" ? "not-allowed" : "pointer",
          }}
        >
          戻る
        </button>
        {currentStep === "main" && (
          <button onClick={onNext} style={s.nextBtn}>
            次へ（詳細設定）
          </button>
        )}
        <button
          onClick={onPublish}
          disabled={!canPublish || submitting}
          style={{
            ...s.publishBtn,
            ...(!canPublish || submitting ? s.publishBtnBusy : {}),
          }}
        >
          {submitting ? "出品中..." : "出品する"}
        </button>
      </div>
    </div>
  );
}
