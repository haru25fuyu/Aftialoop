// StickyFooter.tsx
export function StickyFooter({ canPublish, loading, onDraft, onPublish }: {
    canPublish: boolean; loading?: boolean; onDraft: () => void; onPublish: () => void;
}) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 py-3">
                <button onClick={onDraft} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">下書き保存</button>
                <button
                    disabled={!canPublish || loading}
                    onClick={onPublish}
                    className={[
                        "rounded px-4 py-2 text-sm text-white",
                        canPublish && !loading ? "bg-black hover:opacity-90" : "bg-gray-400 cursor-not-allowed"
                    ].join(" ")}
                >
                    {loading ? "公開中…" : "今すぐ公開"}
                </button>
            </div>
        </div>
    );
}