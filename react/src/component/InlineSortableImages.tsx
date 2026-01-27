import React from "react";
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core";
import {
    SortableContext, rectSortingStrategy, useSortable, arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { ImageAsset } from "../types/FleaMarket";
import { CONFIG } from "../conf/config";


type Props = {
    files: ImageAsset[];
    max?: number;
    urls?: string[];
    onChange: (next: ImageAsset[]) => void;
    onOpenAdd: () => void;
};

export default function InlineSortableImages({ files, onChange, onOpenAdd }: Props) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    const items = files;


    const onDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const oldIndex = items.findIndex(x => x.id === active.id);
        const newIndex = items.findIndex(x => x.id === over.id);
        const next = arrayMove(items, oldIndex, newIndex);
        onChange(next); // 並び替えた ImageAsset配列 を返す
    };

    const removeAt = (i: number) => {
        const next = items.filter((_, idx) => idx !== i);
        onChange(next);
    };

    const makeMain = (i: number) => {
        if (i === 0) return;
        const next = arrayMove(items, i, 0);
        onChange(next);
    };

    return (
        <div className="grid grid-cols-4 gap-3">
            {/* 0枚の時は大きなボタンを表示（ここだけ残す） */}
            {items.length === 0 && (
                <button
                    type="button"
                    onClick={onOpenAdd}
                    className="col-span-4 aspect-[4/3] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-gray-400 hover:text-gray-600 transition-all w-full h-full"
                >
                    <span className="text-4xl font-light mb-1">＋</span>
                    <span className="text-xs font-bold">写真を追加</span>
                </button>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={items.map(it => it.id)} strategy={rectSortingStrategy}>
                    {items.map((it, i) => (
                        <div key={it.id} className={i === 0 ? "col-span-4 aspect-[4/3]" : "col-span-1 aspect-square"}>
                            <Thumb
                                id={it.id}
                                url={CONFIG.BASE_URL + it.url} // ★変更: ImageAsset内のurlを使う
                                isMain={i === 0}
                                onRemove={() => removeAt(i)}
                                onMakeMain={() => makeMain(i)}
                            />
                        </div>
                    ))}
                </SortableContext>
            </DndContext>
        </div>
    );
}

function Thumb({
    id, url, isMain, onRemove, onMakeMain,
}: { id: string; url: string; isMain: boolean; onRemove: () => void; onMakeMain: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative w-full h-full rounded-xl overflow-hidden border border-gray-200 bg-white select-none shadow-sm touch-none group">

            {/* 1. Image */}
            <img src={url} className="w-full h-full object-cover pointer-events-none" />

            {/* 2. Drag Layer (Moved to the back, but visually covers the image) */}
            <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

            {/* 3. Buttons (Placed AFTER the drag layer with z-10) */}
            {isMain && (
                <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded z-10 pointer-events-none">
                    Main
                </div>
            )}

            {!isMain && (
                <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()} // Stop drag start
                    onClick={(e) => { e.stopPropagation(); onMakeMain(); }}
                    className="absolute top-1 left-1 bg-white/90 text-xs font-bold px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                    Make Main
                </button>
            )}

            <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()} // Stop drag start
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-500 transition-colors z-10"
            >
                ×
            </button>
        </div>
    );
}