// BaseDetailsModal.tsx
export function BaseDetailsModal({
    open, title, onClose, onSave, children, saving
}: {
    open: boolean; title: string; onClose: () => void; onSave: () => void; children: React.ReactNode; saving?: boolean;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="absolute left-1/2 top-1/2 w-[min(720px,92vw)] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-white shadow-lg">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h3 className="text-base font-semibold">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-black">✕</button>
                </div>
                <div className="max-h-[calc(80vh-112px)] overflow-auto p-4">{children}</div>
                <div className="flex justify-end gap-3 border-t px-4 py-3">
                    <button onClick={onClose} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">閉じる</button>
                    <button onClick={onSave} disabled={!!saving}
                        className="rounded bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60">
                        {saving ? "保存中…" : "保存する"}
                    </button>
                </div>
            </div>
        </div>
    );
}
