import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CONFIG } from "../conf/config";
import { ImageAsset } from "../types/FleaMarket";
import { s } from "../styles/modal/AddImagesModal.styles";

type Item = {
  id: string;
  url: string;
  owned: boolean;
  file?: File;
  serverId?: number;
};

function SortableItem({
  item,
  index,
  onRemove,
  onMain,
}: {
  item: Item;
  index: number;
  onRemove: () => void;
  onMain: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
        width: 120,
        height: 120,
        flexShrink: 0,
      }}
      {...attributes}
      {...listeners}
    >
      <img
        src={
          item.url.startsWith("blob:") ? item.url : CONFIG.BASE_URL + item.url
        }
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: 8,
          border: index === 0 ? "2px solid #1a5adc" : "1px solid #e0ddd8",
        }}
      />
      {index === 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(26,90,220,0.9)",
            fontSize: 10,
            fontWeight: 700,
            color: "#fff",
            textAlign: "center",
            padding: "2px 0",
            borderRadius: "0 0 8px 8px",
          }}
        >
          メイン
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: "rgba(0,0,0,0.6)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          lineHeight: 1,
        }}
      >
        ×
      </button>
      {index !== 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMain();
          }}
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            fontSize: 10,
            padding: "2px 6px",
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          メインに
        </button>
      )}
    </div>
  );
}

export default function AddImagesModal({
  open,
  initialImages,
  max = 10,
  onClose,
  onSave,
}: {
  open: boolean;
  initialImages: ImageAsset[];
  max?: number;
  onClose: () => void;
  onSave: (ordered: ImageAsset[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (open) {
      setItems(
        initialImages.map((img) => ({
          id: img.id,
          url: img.url,
          file: img.file,
          serverId: img.serverId,
          owned: false,
        })),
      );
    } else {
      setItems([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return () => {
      items.forEach((it) => {
        if (it.owned) URL.revokeObjectURL(it.url);
      });
    };
  }, [open]);

  const pick = (list: FileList | null) => {
    if (!list) return;
    const remain = Math.max(0, max - items.length);
    if (remain <= 0) return;
    const add = Array.from(list)
      .slice(0, remain)
      .map(
        (f, i) =>
          ({
            id: `new-${Date.now()}-${i}`,
            file: f,
            url: URL.createObjectURL(f),
            owned: true,
          }) as Item,
      );
    setItems((prev) => [...prev, ...add]);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) =>
      arrayMove(
        prev,
        prev.findIndex((x) => x.id === active.id),
        prev.findIndex((x) => x.id === over.id),
      ),
    );
  };

  const handleSave = () => {
    onSave(
      items.map((it) => ({
        id: it.id,
        url: it.url,
        file: it.file,
        serverId: it.serverId,
      })),
    );
  };

  if (!open) return null;

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.header}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>
            画像を追加・並び替え（{items.length}/{max}）
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#8c8c8c",
              fontSize: 22,
            }}
          >
            ×
          </button>
        </div>
        <div style={s.body}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={items.map((x) => x.id)}
              strategy={rectSortingStrategy}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {items.map((item, i) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    index={i}
                    onRemove={() =>
                      setItems((prev) => {
                        const t = prev[i];
                        if (t?.owned) URL.revokeObjectURL(t.url);
                        return prev.filter((_, idx) => idx !== i);
                      })
                    }
                    onMain={() => setItems((prev) => arrayMove(prev, i, 0))}
                  />
                ))}
                {items.length < max && (
                  <button
                    onClick={() => inputRef.current?.click()}
                    style={{
                      width: 120,
                      height: 120,
                      border: "2px dashed #e0ddd8",
                      borderRadius: 8,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      background: "none",
                      cursor: "pointer",
                      color: "#8c8c8c",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontSize: 28 }}>+</span>
                    <span>追加</span>
                  </button>
                )}
              </div>
            </SortableContext>
          </DndContext>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              pick(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        <div style={s.footer}>
          <button onClick={onClose} style={s.cancelBtn}>
            キャンセル
          </button>
          <button onClick={handleSave} style={s.saveBtn}>
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}
