import { s } from "../../styles/component/fleaMarket/CreateItemHeaderArea.styles";

type Props = {
  draftId: number | null;
  saving: "idle" | "saving" | "saved" | "error";
  lastSavedAt: string | null;
  onSave: () => void;
  onReset: () => void;
};

export function HeaderArea({
  draftId,
  saving,
  lastSavedAt,
  onSave,
  onReset,
}: Props) {
  return (
    <div style={s.header}>
      <div style={s.inner}>
        <h1 style={s.title}>{draftId ? "下書きを編集" : "商品の情報を入力"}</h1>
        <div style={s.btnRow}>
          <SaveIndicator saving={saving} lastSavedAt={lastSavedAt} />
          <button
            type="button"
            onClick={onSave}
            disabled={saving === "saving"}
            style={s.draftBtn}
          >
            保存
          </button>
          <button type="button" onClick={onReset} style={s.resetBtn}>
            {draftId ? "新規にする" : "クリア"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({
  saving,
  lastSavedAt,
}: {
  saving: string;
  lastSavedAt: string | null;
}) {
  if (saving === "saving") return <span style={s.savingText}>保存中…</span>;
  if (saving === "error")
    return <span style={{ fontSize: 12, color: "#d63c20" }}>保存エラー</span>;
  if (saving === "saved")
    return (
      <span style={s.savedText}>
        保存済み
        {lastSavedAt ? `（${new Date(lastSavedAt).toLocaleTimeString()}）` : ""}
      </span>
    );
  return null;
}
