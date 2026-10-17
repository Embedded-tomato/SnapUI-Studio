import type { PageId } from "@/types/editor";
import { COMPONENT_DEFS } from "@/lib/components";

interface Props {
  page: PageId;
}

/** 左侧组件库：只显示当前页面可用的组件，拖拽即加入 */
export default function ComponentPalette({ page }: Props) {
  const defs = COMPONENT_DEFS.filter((d) => {
    const s = d.slots[0];
    if (page === "preview") return ["topbar", "leftbar", "center", "bottombar"].includes(s);
    if (page === "settings") return s === "settingsRows";
    if (page === "album") return s === "albumGrid";
    return s === "challengeRows";
  });

  return (
    <div className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">组件库</h2>
        <p className="text-xs text-gray-400 mt-0.5">拖到屏幕上，自动吸附到位</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {defs.map((d) => (
          <div
            key={d.type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("component-type", d.type);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className="flex items-start gap-2.5 p-3 rounded-lg border border-gray-200 bg-white cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-sm transition-all select-none"
          >
            <span className="text-xl leading-none mt-0.5">{d.icon}</span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-800">{d.name}</span>
              <span className="block text-xs text-gray-400 truncate">{d.desc}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
        组件位置、样式已预制，无需手动排版
      </div>
    </div>
  );
}
