import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core";
import {
    SortableContext, rectSortingStrategy, useSortable, arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Item = { id: string; file: File; url: string; owned: boolean };

export default function AddImagesModal({
    open, files, urls, max = 10, onClose, onSave,
}: {
    open: boolean;
    files: File[];     // 親の既存画像
    urls: string[];    // 親が生成した既存URL（filesと同順）
    max?: number;
    onClose: () => void;
    onSave: (ordered: File[]) => void; // 先頭=メインで返す
}) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [items, setItems] = useState<Item[]>([]);

    // 開いた時点の既存画像を取り込み（既存URLはowned:falseでrevokeしない）
    useEffect(() => {
        if (!open) return;
        const init: Item[] = files.map((f, i) => ({
            id: `${i}-${f.name}-${f.size}-${f.lastModified}`,
            file: f,
            url: urls[i],     // 既存は親URLを使用
            owned: false,     // 親管理なのでrevokeしない
        }));
        setItems(init);
    }, [open, files, urls]);

    // モーダルが閉じるときに「モーダルが生成したURL」だけrevoke
    useEffect(() => {
        if (!open) return;
        return () => {
            items.forEach(it => { if (it.owned) URL.revokeObjectURL(it.url); });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const pick = (list: FileList | null) => {
        if (!list) return;
        const remain = Math.max(0, max - items.length);
        if (remain <= 0) return;
        const add = Array.from(list).slice(0, remain).map((f, i) => {
            const url = URL.createObjectURL(f); // モーダル内で暫定URLを生成
            return {
                id: `${Date.now()}-${i}-${f.name}-${f.size}`,
                file: f,
                url,
                owned: true, // モーダルが所有＝revoke対象
            } as Item;
        });
        setItems(prev => [...prev, ...add]);
    };

    const onDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const oldIndex = items.findIndex(x => x.id === active.id);
        const newIndex = items.findIndex(x => x.id === over.id);
        setItems(arrayMove(items, oldIndex, newIndex));
    };

    const removeAt = (i: number) => {
        setItems(prev => {
            const target = prev[i];
            if (target?.owned) URL.revokeObjectURL(target.url); // モーダル生成分だけ破棄
            const next = prev.filter((_, idx) => idx !== i);
            return next;
        });
    };

    const makeMain = (i: number) => {
        if (i === 0) return;
        setItems(prev => arrayMove(prev, i, 0)); // 先頭へ
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="bg-white w-[92%] max-w-3xl rounded-2xl shadow-xl">
                <div className="px-5 py-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">画像を追加・並び替え（{items.length}/{max}）</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                </div>

                <div className="p-5 space-y-4 max-h-[70vh] overflow-auto">
                    <div className="flex justify-center">
                        <button
                            onClick={() => inputRef.current?.click()}
                            className="rounded-xl border border-dashed px-6 py-3 text-gray-600 hover:bg-gray-50"
                        >
                            ＋ 画像を選択
                        </button>
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => pick(e.target.files)}
                        />
                    </div>

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                        <SortableContext items={items.map(it => it.id)} strategy={rectSortingStrategy}>
                            <div className="flex gap-3 flex-wrap justify-center">
                                {items.map((it, i) => (
                                    <Thumb
                                        key={it.id}
                                        id={it.id}
                                        url={it.url}           // 既存は親URL、新規はモーダルURL
                                        isMain={i === 0}
                                        onRemove={() => removeAt(i)}
                                        onMakeMain={() => makeMain(i)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                <div className="px-5 py-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 h-10 rounded-xl border bg-white">キャンセル</button>
                    <button
                        onClick={() => onSave(items.map(x => x.file))} // 並び順（先頭=メイン）を返す
                        className="px-4 h-10 rounded-xl bg-black text-white"
                    >
                        反映する
                    </button>
                </div>
            </div>
        </div>
    );
}

function Thumb({
    id, url, isMain, onRemove, onMakeMain,
}: { id: string; url: string; isMain: boolean; onRemove: () => void; onMakeMain: () => void }) {
    // dnd-kit
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined };

    return (
        <div ref={setNodeRef} style={style} className="relative w-36 h-36 md:w-40 md:h-40 rounded-xl overflow-hidden border bg-white select-none">
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
