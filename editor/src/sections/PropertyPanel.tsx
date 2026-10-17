import type { PlacedComponent } from "@/types/editor";
import { getDef } from "@/lib/components";

interface Props {
  item: PlacedComponent | null;
  onChange: (id: string, key: string, value: string | number | boolean) => void;
}

/** 右侧属性面板：只暴露可改的内容，不改布局 */
export default function PropertyPanel({ item, onChange }: Props) {
  return (
    <div className="w-64 shrink-0 bg-white border-l border-gray-200 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">属性</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!item ? (
          <p className="text-xs text-gray-400">点击屏幕上的组件进行编辑</p>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-gray-400">
              {getDef(item.type).name}
              <span className="ml-2 text-gray-300">#{item.id.slice(0, 6)}</span>
            </div>
            {getDef(item.type).propsSchema.length === 0 && (
              <p className="text-xs text-gray-400">该组件无可编辑属性</p>
            )}
            {getDef(item.type).propsSchema.map((s) => {
              const v = item.props[s.key];
              if (s.kind === "boolean") {
                return (
                  <label key={s.key} className="flex items-center justify-between text-sm text-gray-700">
                    {s.label}
                    <input
                      type="checkbox"
                      checked={Boolean(v)}
                      onChange={(e) => onChange(item.id, s.key, e.target.checked)}
                      className="w-4 h-4 accent-blue-500"
                    />
                  </label>
                );
              }
              if (s.kind === "number") {
                return (
                  <label key={s.key} className="block text-sm text-gray-700">
                    <span className="block mb-1">{s.label}</span>
                    <input
                      type="number"
                      value={Number(v)}
                      onChange={(e) => onChange(item.id, s.key, Number(e.target.value))}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                  </label>
                );
              }
              return (
                <label key={s.key} className="block text-sm text-gray-700">
                  <span className="block mb-1">{s.label}</span>
                  <input
                    type="text"
                    value={String(v)}
                    onChange={(e) => onChange(item.id, s.key, e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
