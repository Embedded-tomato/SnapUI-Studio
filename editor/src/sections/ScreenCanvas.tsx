import { useState } from "react";
import type { PageId, PlacedComponent, SlotId } from "@/types/editor";
import { ComponentPreview, getDef } from "@/lib/components";

const SLOT_META: Record<SlotId, { name: string; className: string }> = {
  topbar: { name: "顶栏", className: "absolute top-0 left-0 right-0 h-11" },
  leftbar: { name: "参数栏", className: "absolute left-0 top-11 bottom-16 w-32" },
  center: { name: "取景区", className: "absolute left-32 right-0 top-11 bottom-16" },
  bottombar: { name: "底栏", className: "absolute bottom-0 left-0 right-0 h-16" },
  settingsRows: { name: "设置列表", className: "absolute left-16 right-16 top-16 bottom-6" },
  albumGrid: { name: "相册网格", className: "absolute left-8 right-8 top-14 bottom-6" },
  challengeRows: { name: "挑战列表", className: "absolute left-16 right-16 top-16 bottom-6" },
};

const PAGE_SLOTS: Record<PageId, SlotId[]> = {
  preview: ["topbar", "leftbar", "center", "bottombar"],
  settings: ["settingsRows"],
  album: ["albumGrid"],
  challenge: ["challengeRows"],
};

const PAGE_TITLE: Partial<Record<PageId, string>> = {
  settings: "设置",
  album: "相册",
  challenge: "挑战",
};

interface Props {
  page: PageId;
  items: PlacedComponent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDropComponent: (type: string, slot: SlotId) => void;
  onRemove: (id: string) => void;
}

export default function ScreenCanvas({
  page,
  items,
  selectedId,
  onSelect,
  onDropComponent,
  onRemove,
}: Props) {
  const [dragOver, setDragOver] = useState<SlotId | null>(null);
  const [dragging, setDragging] = useState(false);

  const slots: SlotId[] = PAGE_SLOTS[page];

  const handleDragOver = (e: React.DragEvent, slot: SlotId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(slot);
  };

  const handleDrop = (e: React.DragEvent, slot: SlotId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    setDragOver(null);
    const type = e.dataTransfer.getData("component-type");
    if (!type) return;
    const def = getDef(type);
    // 自动吸附：落到该组件声明的默认槽位；只有明确拖到合法槽位时才用指定槽位
    const target = def.slots.includes(slot) ? slot : def.slots[0];
    onDropComponent(type, target);
  };

  const renderSlot = (slot: SlotId) => {
    const meta = SLOT_META[slot];
    const slotItems = items.filter((i) => i.slot === slot);
    const horizontal = slot === "topbar" || slot === "bottombar";
    const isRows = slot === "settingsRows" || slot === "challengeRows";
    const isGrid = slot === "albumGrid";

    return (
      <div
        key={slot}
        className={`${meta.className} ${
          dragging
            ? dragOver === slot
              ? "ring-2 ring-blue-400 bg-blue-400/10 z-20"
              : "ring-1 ring-dashed ring-white/40 z-20"
            : ""
        }`}
        onDragOver={(e) => handleDragOver(e, slot)}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, slot)}
      >
        {dragging && (
          <span className="absolute top-1 right-2 text-[10px] text-white/70 bg-black/50 rounded px-1.5 py-0.5 pointer-events-none">
            {meta.name}
          </span>
        )}
        <div
          className={
            isRows
              ? "flex flex-col gap-2 h-full overflow-hidden"
              : isGrid
              ? "flex flex-wrap gap-3 content-start h-full overflow-hidden"
              : horizontal
              ? "flex items-center justify-between h-full px-4 gap-2"
              : slot === "leftbar"
              ? "flex flex-col items-start gap-2 p-2"
              : "relative w-full h-full"
          }
        >
          {slotItems.length === 0 && !dragging && (
            <span className="m-auto text-white/25 text-xs pointer-events-none select-none">
              {slot === "center" ? "" : `拖组件到${meta.name}`}
            </span>
          )}
          {slotItems.map((item) => (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item.id);
              }}
              className={`group relative cursor-pointer rounded ${
                slot === "center" ? "" : ""
              } ${
                selectedId === item.id
                  ? "ring-2 ring-blue-400"
                  : "hover:ring-1 hover:ring-white/50"
              }`}
            >
              <ComponentPreview item={item} />
              {selectedId === item.id && (
                <button
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full leading-none z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                    onSelect(null);
                  }}
                  title="删除"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative bg-neutral-900 rounded-lg shadow-2xl overflow-hidden shrink-0"
      style={{ width: 800, height: 480 }}
      onDragOver={() => setDragging(true)}
      onClick={() => onSelect(null)}
    >
      {/* 页面底纹与标题 */}
      {page === "preview" ? (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 via-neutral-800 to-neutral-900" />
      ) : (
        <div className="absolute inset-0 bg-neutral-900">
          <div className="text-gray-100 text-base font-medium text-center mt-5">
            {PAGE_TITLE[page]}
          </div>
        </div>
      )}
      {slots.map(renderSlot)}
      <div className="absolute bottom-1 right-2 text-[10px] text-white/30 pointer-events-none">
        800 × 480
      </div>
    </div>
  );
}
