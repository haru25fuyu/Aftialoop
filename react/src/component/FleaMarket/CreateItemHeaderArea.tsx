
type HeaderAreaProps = {
    draftId: number | null;
    saving: "idle" | "saving" | "saved" | "error";
    lastSavedAt: string | null;
    onSave: () => void;
    onReset: () => void;
};

export function HeaderArea({ draftId, saving, lastSavedAt, onSave, onReset }: HeaderAreaProps) {
    return (
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
            <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                <h1 className="font-bold text-base">
                    {draftId ? "下書きを編集" : "商品の情報を入力"}
                </h1>

                <div className="flex items-center gap-3">
                    <SaveIndicator saving={saving} lastSavedAt={lastSavedAt} />

                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving === "saving"}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 border border-blue-600 rounded px-2 py-1 disabled:opacity-50"
                    >
                        保存
                    </button>

                    <button
                        type="button"
                        onClick={onReset}
                        className="text-xs text-gray-500 hover:text-red-600 underline"
                    >
                        {draftId ? "新規にする" : "クリア"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SaveIndicator({ saving, lastSavedAt }: { saving: string; lastSavedAt: string | null }) {
    if (saving === "saving") return <span className="text-xs text-gray-500">保存中…</span>;
    if (saving === "error") return <span className="text-xs text-red-600">保存エラー</span>;
    if (saving === "saved") return <span className="text-[11px] text-gray-500">保存済み{lastSavedAt ? `（${new Date(lastSavedAt).toLocaleTimeString()}）` : ""}</span>;
    return null;
}