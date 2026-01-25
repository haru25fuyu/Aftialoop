import React, { useEffect, useRef, useState } from "react";
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core";
import {
    SortableContext, rectSortingStrategy, useSortable, arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CONFIG } from "../conf/config";
import { ImageAsset } from "../types/FleaMarket"; // ★型をインポート

// 内部管理用の型を拡張
type Item = { 
    id: string; 
    url: string; 
    owned: boolean; 
    file?: File;         // fileは任意（サーバー画像には無い）
    serverId?: number;   // サーバーID（あれば保持）
};

export default function AddImagesModal({
    open, 
    initialImages, // ★変更: files, urls の代わりにこれを受け取る
    max = 10, 
    onClose, 
    onSave,
}: {
    open: boolean;
    initialImages: ImageAsset[]; // ★ ImageAsset配列を受け取る
    max?: number;
    onClose: () => void;
    onSave: (ordered: ImageAsset[]) => void; // ★ ImageAsset配列を返す
}) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [items, setItems] = useState<Item[]>([]);

    // ★修正: 開いたときに ImageAsset[] から初期状態を作る
    useEffect(() => {
        if (open) {
            const init: Item[] = initialImages.map((img) => ({
                id: img.id,
                url: img.url,
                file: img.file,          // あれば保持
                serverId: img.serverId,  // あれば保持
                owned: false,            // 親管理なのでrevokeしない
            }));
            setItems(init);
        } else {
            setItems([]);
        }
    }, [open]); // initialImages は open と同期している前提

    // 閉じる時のrevoke処理（ownedなものだけ）
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
            const url = URL.createObjectURL(f);
            return {
                id: `new-${Date.now()}-${i}`,
                file: f,
                url,
                owned: true, // 新規追加分なのでモーダルが所有
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
            if (target?.owned) URL.revokeObjectURL(target.url);
            return prev.filter((_, idx) => idx !== i);
        });
    };

    const makeMain = (i: number) => {
        if (i === 0) return;
        setItems(prev => arrayMove(prev, i, 0));
    };

    // ★追加: 保存ボタンが押されたら、Item[] を ImageAsset[] に戻して返す
    const handleSave = () => {
        const result: ImageAsset[] = items.map(it => ({
            id: it.id,
            url: it.url,
            file: it.file,
            serverId: it.serverId,
        }));
        onSave(result);
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
                                        // サーバー画像(/static/...)ならBASE_URLをつける、blobならそのまま
                                        url={it.url.startsWith("blob:") ? it.url : CONFIG.BASE_URL + it.url}
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
                        onClick={handleSave} // ★修正した関数を呼ぶ
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
