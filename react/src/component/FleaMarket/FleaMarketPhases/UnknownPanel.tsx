// UnknownPanel.tsx
import React from "react";
import { FleaThreadResponse } from "../../types/FleaMarket";

export default function UnknownPanel({ data }: { data: FleaThreadResponse }) {
    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold">状態が不明</div>
            <pre className="mt-3 text-xs overflow-auto rounded-xl bg-gray-50 p-3 border">
                {JSON.stringify(data.tx, null, 2)}
            </pre>
        </div>
    );
}
