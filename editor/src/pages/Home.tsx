import { useMemo, useRef, useState } from "react";
import ComponentPalette from "@/sections/ComponentPalette";
import ScreenCanvas from "@/sections/ScreenCanvas";
import PropertyPanel from "@/sections/PropertyPanel";
import SpjCanvas from "@/sections/SpjCanvas";
import { getDef } from "@/lib/components";
import { parseSpj, type SpjProject } from "@/lib/spj";
import type { PageId, PlacedComponent, SlotId, UiProject } from "@/types/editor";

const INITIAL: Record<PageId, PlacedComponent[]> = {
  preview: [
    { id: "c1", type: "title", slot: "topbar", props: { text: "相机 Demo" } },
    { id: "c2", type: "clock", slot: "topbar", props: {} },
    { id: "c3", type: "battery", slot: "topbar", props: { percent: 86 } },
    { id: "c4", type: "param", slot: "leftbar", props: { text: "ISO 100" } },
    { id: "c5", type: "param", slot: "leftbar", props: { text: "F1.8" } },
    { id: "c6", type: "param", slot: "leftbar", props: { text: "1/125" } },
    { id: "c7", type: "bigbutton", slot: "bottombar", props: { text: "回放", accent: false } },
    { id: "c8", type: "bigbutton", slot: "bottombar", props: { text: "拍照", accent: true } },
    { id: "c9", type: "bigbutton", slot: "bottombar", props: { text: "设置", accent: false } },
  ],
  settings: [
    { id: "s1", type: "setting-switch", slot: "settingsRows", props: { label: "网格线", on: true } },
    { id: "s2", type: "setting-switch", slot: "settingsRows", props: { label: "电子防抖", on: false } },
    { id: "s3", type: "setting-switch", slot: "settingsRows", props: { label: "人脸识别", on: true } },
    { id: "s4", type: "setting-slider", slot: "settingsRows", props: { label: "曝光补偿", value: 50 } },
    { id: "s5", type: "setting-option", slot: "settingsRows", props: { label: "照片尺寸", value: "12MP" } },
  ],
  album: [
    { id: "a1", type: "photocell", slot: "albumGrid", props: { label: "10-01" } },
    { id: "a2", type: "photocell", slot: "albumGrid", props: { label: "10-02" } },
    { id: "a3", type: "photocell", slot: "albumGrid", props: { label: "10-03" } },
    { id: "a4", type: "photocell", slot: "albumGrid", props: { label: "10-04" } },
    { id: "a5", type: "photocell", slot: "albumGrid", props: { label: "10-05" } },
    { id: "a6", type: "photocell", slot: "albumGrid", props: { label: "10-06" } },
  ],
  challenge: [
    { id: "h1", type: "challengerow", slot: "challengeRows", props: { label: "每日一拍", progress: 60 } },
    { id: "h2", type: "challengerow", slot: "challengeRows", props: { label: "夜景大师", progress: 25 } },
    { id: "h3", type: "challengerow", slot: "challengeRows", props: { label: "人像十连", progress: 90 } },
  ],
};

/** 手势导航：preview 左滑→设置，上滑→相册，下滑→挑战；各子页反向滑回 */
const NAV = {
  preview: { left: "settings", up: "album", down: "challenge" },
  settings: { right: "preview" },
  album: { down: "preview" },
  challenge: { up: "preview" },
} as const;

let seq = 100;
const nid = () => `n${seq++}`;

export default function Home() {
  const [page, setPage] = useState<PageId>("preview");
  const [pages, setPages] = useState(INITIAL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imported, setImported] = useState<SpjProject | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const importSpj = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      setImported(parseSpj(json));
    } catch {
      alert("不是有效的 .spj 工程文件");
    }
  };

  const exportImported = () => {
    if (!imported) return;
    const blob = new Blob([JSON.stringify(imported, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "imported-ui.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const items = pages[page];
  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  const addComponent = (type: string, slot: SlotId) => {
    const def = getDef(type);
    setPages((prev) => {
      const list = prev[page];
      // unique 组件：同槽位已存在则替换
      const filtered =
        def.unique && list.some((i) => i.type === type && i.slot === slot)
          ? list.filter((i) => !(i.type === type && i.slot === slot))
          : list;
      const item: PlacedComponent = {
        id: nid(),
        type,
        slot,
        props: { ...def.defaultProps },
      };
      return { ...prev, [page]: [...filtered, item] };
    });
  };

  const removeComponent = (id: string) =>
    setPages((prev) => ({ ...prev, [page]: prev[page].filter((i) => i.id !== id) }));

  const updateProp = (id: string, key: string, value: string | number | boolean) =>
    setPages((prev) => ({
      ...prev,
      [page]: prev[page].map((i) =>
        i.id === id ? { ...i, props: { ...i.props, [key]: value } } : i
      ),
    }));

  const exportJson = () => {
    const project: UiProject = {
      screen: { width: 800, height: 480 },
      nav: NAV,
      pages,
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "camera-ui.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const [building, setBuilding] = useState(false);
  const [buildLog, setBuildLog] = useState("");

  const simulate = async () => {
    setBuilding(true);
    setBuildLog("正在生成代码并编译…");
    const project: UiProject = {
      screen: { width: 800, height: 480 },
      nav: NAV,
      pages,
    };
    try {
      const b = await fetch("http://localhost:7600/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      }).then((r) => r.json());
      if (!b.ok) throw new Error(b.error);
      setBuildLog(b.log + "\n正在启动模拟器…");
      const r = await fetch("http://localhost:7600/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).then((r) => r.json());
      if (!r.ok) throw new Error(r.error);
      setBuildLog(b.log + "\n✅ 模拟器已启动（可点击按钮、按住拖动滑屏换页）");
    } catch (e) {
      setBuildLog("❌ " + (e as Error).message + "\n\n请确认本地服务已启动：python server.py");
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0">
        <h1 className="text-base font-bold text-gray-900">相机 UI 编辑器</h1>
        {!imported && (
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(
              [
                ["preview", "拍照"],
                ["album", "相册"],
                ["settings", "设置"],
                ["challenge", "挑战"],
              ] as [PageId, string][]
            ).map(([id, name]) => (
              <button
                key={id}
                onClick={() => {
                  setPage(id);
                  setSelectedId(null);
                }}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  page === id
                    ? "bg-white text-gray-900 shadow-sm font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {imported && (
          <span className="text-sm text-emerald-600 font-medium">
            已导入 SquareLine 工程 · {imported.pages.length} 个页面
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => fileRef.current?.click()}
          className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          导入 .spj 工程
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".spj"
          className="hidden"
          onChange={importSpj}
        />
        {imported && (
          <>
            <button
              onClick={exportImported}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              导出中间 JSON
            </button>
            <button
              onClick={() => setImported(null)}
              className="px-4 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              返回编辑器
            </button>
          </>
        )}
        {!imported && (
          <>
            <button
              onClick={simulate}
              disabled={building}
              className="px-4 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {building ? "编译中…" : "▶ 仿真运行"}
            </button>
            <button
              onClick={exportJson}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              导出配置 JSON
            </button>
          </>
        )}
      </header>
      {buildLog && !imported && (
        <div className="bg-gray-900 text-green-300 text-xs font-mono px-4 py-2 whitespace-pre-wrap shrink-0 max-h-28 overflow-y-auto">
          {buildLog}
        </div>
      )}

      {imported ? (
        <div className="flex-1 flex min-h-0">
          <ComponentPalette page="preview" />
          <SpjCanvas project={imported} onChange={setImported} />
        </div>
      ) : (
      <div className="flex-1 flex min-h-0">
        <ComponentPalette page={page} />
        <main className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <ScreenCanvas
            page={page}
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDropComponent={addComponent}
            onRemove={removeComponent}
          />
        </main>
        <PropertyPanel item={selected} onChange={updateProp} />
      </div>
      )}
    </div>
  );
}
