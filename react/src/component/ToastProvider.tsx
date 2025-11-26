import React, { useCallback, useState } from "react";
import { ToastCtx, type ToastMsg } from "../conf/toast-context";

export default function ToastProvider({ children }: { children: React.ReactNode }) {
    const [list, setList] = useState<ToastMsg[]>([]);
    const toast = useCallback((m: Omit<ToastMsg, "id">) => {
        const id = Date.now() + Math.random();
        setList(prev => [...prev, { id, ...m }]);
        setTimeout(() => setList(prev => prev.filter(x => x.id !== id)), 2500);
    }, []);

    return (
        <ToastCtx.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 space-y-2">
                {list.map(t => (
                    <div
                        key={t.id}
                        className={[
                            "rounded-md px-4 py-2 shadow border text-sm backdrop-blur bg-white/90",
                            t.kind === "success" ? "border-green-300" :
                                t.kind === "error" ? "border-red-300" : "border-gray-300",
                        ].join(" ")}
                        role="status" aria-live="polite"
                    >
                        {t.text}
                    </div>
                ))}
            </div>
        </ToastCtx.Provider>
    );
}
