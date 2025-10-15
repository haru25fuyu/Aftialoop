import React, { useEffect, useState } from "react";
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core";
import {
    SortableContext, rectSortingStrategy, useSortable, arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
    files: File[];
    max?: number;
    urls?: string[];               // 既存画像のURL（順序＝現状）
    onChange: (next: File[]) => void;   // 先頭がメイン
    onOpenAdd: () => void;              // 追加モーダルを開く
};

export default function InlineSortableImages({ files, urls, max = 10, onChange, onOpenAdd }: Props) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    const [items, setItems] = useState<{ id: string; file: File }[]>([]);

    useEffect(() => {
        setItems(files.map((f, i) => ({ id: `${i}-${f.name}-${f.size}-${f.lastModified}`, file: f })));
    }, [files]);

    const onDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const oldIndex = items.findIndex(x => x.id === active.id);
        const newIndex = items.findIndex(x => x.id === over.id);
        const next = arrayMove(items, oldIndex, newIndex);
        setItems(next);
        onChange(next.map(x => x.file)); // 先頭=メイン
    };

    const removeAt = (i: number) => {
        const next = items.filter((_, idx) => idx !== i);
        setItems(next);
        onChange(next.map(x => x.file));
    };

    const makeMain = (i: number) => {
        if (i === 0) return;
        const next = arrayMove(items, i, 0);
        setItems(next);
        onChange(next.map(x => x.file));
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-3">
                {items.length < max && (
                    <button
                        type="button"
                        onClick={onOpenAdd}
                        className="rounded-xl border border-dashed px-4 py-8 w-40 h-40 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50"
                    >
                        <span className="text-3xl">＋</span>
                        <span className="text-xs mt-1">画像を追加</span>
                    </button>
                )}
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={items.map(it => it.id)} strategy={rectSortingStrategy}>
                    <div className="flex gap-3 flex-wrap">
                        {items.map((it, i) => (
                            <Thumb
                                key={it.id}
                                id={it.id}
                                url={urls ? urls[i] : URL.createObjectURL(it.file)}
                                isMain={i === 0}
                                onRemove={() => removeAt(i)}
                                onMakeMain={() => makeMain(i)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}

function Thumb({
    id, url, isMain, onRemove, onMakeMain,
}: { id: string; url: string; isMain: boolean; onRemove: () => void; onMakeMain: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined };

    return (
        <div ref={setNodeRef} style={style} className="relative w-40 h-40 rounded-xl overflow-hidden border bg-white select-none">
            <img src={url} className="w-full h-full object-cover pointer-events-none" />
            <div className="absolute top-1 left-1 flex gap-1">
                <button type="button" onClick={onMakeMain}
                    className={`px-2 py-1 rounded-md text-xs ${isMain ? "bg-yellow-400 text-black" : "bg-black/60 text-white"}`}>
                    {isMain ? "メイン" : "メインに"}
                </button>
            </div>
            <button type="button" onClick={onRemove}
                className="absolute bottom-1 right-1 px-2 py-1 rounded-md text-xs bg-red-500 text-white">削除</button>
            <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
        </div>
    );
}
