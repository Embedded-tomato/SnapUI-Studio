import type { ComponentDef, PlacedComponent } from "@/types/editor";

/** 预制组件库：每种组件自带布局规则和内部逻辑，拖入即吸附到对应槽位 */
export const COMPONENT_DEFS: ComponentDef[] = [
  {
    type: "title",
    name: "标题文字",
    icon: "🅰️",
    desc: "顶栏标题，如「相机 Demo」",
    slots: ["topbar"],
    propsSchema: [{ key: "text", label: "文字", kind: "text" }],
    defaultProps: { text: "相机 Demo" },
  },
  {
    type: "clock",
    name: "时间显示",
    icon: "🕐",
    desc: "顶栏右侧时间",
    slots: ["topbar"],
    unique: true,
    propsSchema: [],
    defaultProps: {},
  },
  {
    type: "battery",
    name: "电量指示",
    icon: "🔋",
    desc: "顶栏电池图标 + 百分比",
    slots: ["topbar"],
    unique: true,
    propsSchema: [{ key: "percent", label: "电量 %", kind: "number" }],
    defaultProps: { percent: 86 },
  },
  {
    type: "param",
    name: "参数标签",
    icon: "📷",
    desc: "ISO / 光圈 / 快门等拍摄参数",
    slots: ["leftbar"],
    propsSchema: [{ key: "text", label: "内容", kind: "text" }],
    defaultProps: { text: "ISO 100" },
  },
  {
    type: "histogram",
    name: "直方图",
    icon: "📊",
    desc: "实时曝光直方图",
    slots: ["leftbar"],
    unique: true,
    propsSchema: [],
    defaultProps: {},
  },
  {
    type: "grid",
    name: "九宫格线",
    icon: "🔲",
    desc: "取景辅助网格",
    slots: ["center"],
    unique: true,
    propsSchema: [{ key: "visible", label: "默认显示", kind: "boolean" }],
    defaultProps: { visible: true },
  },
  {
    type: "focusbox",
    name: "对焦框",
    icon: "🎯",
    desc: "触摸对焦框",
    slots: ["center"],
    unique: true,
    propsSchema: [],
    defaultProps: {},
  },
  {
    type: "bigbutton",
    name: "功能按钮",
    icon: "🔘",
    desc: "底栏按钮：拍照 / 回放 / 设置",
    slots: ["bottombar"],
    propsSchema: [
      { key: "text", label: "文字", kind: "text" },
      { key: "accent", label: "高亮色", kind: "boolean" },
    ],
    defaultProps: { text: "拍照", accent: false },
  },
  {
    type: "setting-switch",
    name: "开关设置行",
    icon: "🎚️",
    desc: "设置页：名称 + 开关",
    slots: ["settingsRows"],
    propsSchema: [
      { key: "label", label: "名称", kind: "text" },
      { key: "on", label: "默认开", kind: "boolean" },
    ],
    defaultProps: { label: "网格线", on: false },
  },
  {
    type: "setting-slider",
    name: "滑块设置行",
    icon: "🎛️",
    desc: "设置页：名称 + 滑块",
    slots: ["settingsRows"],
    propsSchema: [
      { key: "label", label: "名称", kind: "text" },
      { key: "value", label: "默认值", kind: "number" },
    ],
    defaultProps: { label: "曝光补偿", value: 50 },
  },
  {
    type: "setting-option",
    name: "选项设置行",
    icon: "📋",
    desc: "设置页：名称 + 当前选项",
    slots: ["settingsRows"],
    propsSchema: [
      { key: "label", label: "名称", kind: "text" },
      { key: "value", label: "当前值", kind: "text" },
    ],
    defaultProps: { label: "照片尺寸", value: "12MP" },
  },
  {
    type: "photocell",
    name: "照片格子",
    icon: "🖼️",
    desc: "相册页：一张照片缩略图",
    slots: ["albumGrid"],
    propsSchema: [{ key: "label", label: "标注", kind: "text" }],
    defaultProps: { label: "" },
  },
  {
    type: "challengerow",
    name: "挑战条目",
    icon: "🏆",
    desc: "挑战页：一个拍摄挑战任务",
    slots: ["challengeRows"],
    propsSchema: [
      { key: "label", label: "标题", kind: "text" },
      { key: "progress", label: "进度 %", kind: "number" },
    ],
    defaultProps: { label: "每日一拍", progress: 60 },
  },
];

export function getDef(type: string): ComponentDef {
  return COMPONENT_DEFS.find((d) => d.type === type)!;
}

/** 组件在画布上的视觉呈现（预览用，非最终 LVGL 渲染） */
export function ComponentPreview({ item }: { item: PlacedComponent }) {
  const p = item.props;
  switch (item.type) {
    case "title":
      return <span className="text-white text-sm font-medium">{String(p.text)}</span>;
    case "clock":
      return <span className="text-white text-sm tabular-nums">10:43</span>;
    case "battery":
      return (
        <span className="flex items-center gap-1 text-white text-xs">
          <span className="inline-block w-6 h-3 rounded-sm border border-white relative">
            <span
              className="absolute inset-0.5 bg-green-400 rounded-[2px]"
              style={{ width: `${Number(p.percent) * 0.7}%` }}
            />
          </span>
          {String(p.percent)}%
        </span>
      );
    case "param":
      return (
        <span className="text-white text-xs bg-black/40 rounded px-2 py-1 backdrop-blur-sm">
          {String(p.text)}
        </span>
      );
    case "histogram":
      return (
        <div className="w-24 h-14 bg-black/50 rounded flex items-end gap-[2px] p-1">
          {[40, 70, 55, 90, 65, 45, 80, 60, 35, 50].map((h, i) => (
            <div key={i} className="flex-1 bg-emerald-400/80 rounded-t-[1px]" style={{ height: `${h}%` }} />
          ))}
        </div>
      );
    case "grid":
      return p.visible ? (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/25" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/25" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/25" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/25" />
        </div>
      ) : null;
    case "focusbox":
      return (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-yellow-400 rounded-sm pointer-events-none">
          <div className="absolute -left-1 -top-1 w-3 h-3 border-l-4 border-t-4 border-yellow-400" />
          <div className="absolute -right-1 -top-1 w-3 h-3 border-r-4 border-t-4 border-yellow-400" />
          <div className="absolute -left-1 -bottom-1 w-3 h-3 border-l-4 border-b-4 border-yellow-400" />
          <div className="absolute -right-1 -bottom-1 w-3 h-3 border-r-4 border-b-4 border-yellow-400" />
        </div>
      );
    case "bigbutton":
      return (
        <button
          className={`min-w-24 px-4 py-2.5 rounded-full text-sm font-medium shadow ${
            p.accent ? "bg-blue-500 text-white" : "bg-white/90 text-gray-800"
          }`}
        >
          {String(p.text)}
        </button>
      );
    case "setting-switch":
      return (
        <div className="flex items-center justify-between w-full px-4 py-3 bg-gray-800 rounded-lg">
          <span className="text-gray-100 text-sm">{String(p.label)}</span>
          <span
            className={`w-11 h-6 rounded-full relative transition-colors ${
              p.on ? "bg-blue-500" : "bg-gray-600"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
                p.on ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </div>
      );
    case "setting-slider":
      return (
        <div className="flex items-center gap-3 w-full px-4 py-3 bg-gray-800 rounded-lg">
          <span className="text-gray-100 text-sm w-20 shrink-0">{String(p.label)}</span>
          <div className="flex-1 h-1.5 bg-gray-600 rounded-full relative">
            <div
              className="absolute left-0 top-0 bottom-0 bg-blue-500 rounded-full"
              style={{ width: `${Number(p.value)}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow"
              style={{ left: `${Number(p.value)}%` }}
            />
          </div>
          <span className="text-gray-300 text-xs w-8 text-right">{String(p.value)}</span>
        </div>
      );
    case "setting-option":
      return (
        <div className="flex items-center justify-between w-full px-4 py-3 bg-gray-800 rounded-lg">
          <span className="text-gray-100 text-sm">{String(p.label)}</span>
          <span className="text-gray-400 text-sm">
            {String(p.value)} <span className="ml-1">›</span>
          </span>
        </div>
      );
    case "photocell":
      return (
        <div className="w-40 h-28 bg-gradient-to-br from-slate-500 to-slate-700 rounded-md flex items-end p-1.5">
          <span className="text-white/80 text-[10px]">{String(p.label) || "照片"}</span>
        </div>
      );
    case "challengerow":
      return (
        <div className="flex items-center gap-3 w-full px-4 py-3 bg-gray-800 rounded-lg">
          <span className="text-lg">🏆</span>
          <div className="flex-1 min-w-0">
            <div className="text-gray-100 text-sm">{String(p.label)}</div>
            <div className="mt-1.5 h-1.5 bg-gray-600 rounded-full">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Number(p.progress)}%` }} />
            </div>
          </div>
          <span className="text-amber-400 text-xs">{Number(p.progress)}%</span>
        </div>
      );
    default:
      return null;
  }
}
