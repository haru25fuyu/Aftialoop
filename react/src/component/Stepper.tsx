// component/Stepper.tsx
import React from "react";

type Step = { label: string; optional?: boolean; complete?: boolean };

export function Stepper({
    steps,
    current,
    onSelect,
}: {
    steps: Step[];
    current: number;
    onSelect?: (index: number) => void;
}) {
    return (
        <ol className="flex items-center gap-3 text-sm overflow-x-auto no-scrollbar">
            {steps.map((s, i) => {
                const active = i === current;
                const done = i < current || s.complete;
                return (
                    <li key={i} className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => onSelect?.(i)}
                            className={[
                                "flex items-center gap-2 pr-1",
                                "focus:outline-none focus:ring-2 focus:ring-black/20 rounded",
                                onSelect ? "cursor-pointer" : "cursor-default",
                            ].join(" ")}
                            aria-current={active ? "step" : undefined}
                        >
                            <span
                                className={[
                                    "h-6 w-6 grid place-items-center rounded-full border transition",
                                    done
                                        ? "bg-black text-white border-black"
                                        : active
                                            ? "bg-gray-900 text-white border-gray-900"
                                            : "bg-white text-gray-700 border-gray-300",
                                ].join(" ")}
                            >
                                {done ? "✓" : i + 1}
                            </span>
                            <span className={active ? "font-medium" : ""}>
                                {s.label}
                                {s.optional && <span className="ml-1 text-gray-400">(任意)</span>}
                            </span>
                        </button>
                        {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-gray-300" />}
                    </li>
                );
            })}
        </ol>
    );
}
