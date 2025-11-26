export function Labeled({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="mb-1 flex items-center justify-between">
                <label className="text-sm text-gray-700">{label}</label>
                {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
            {children}
        </div>
    );
}
