/* SnapUI 注册表：模板 + 槽位 + 组件（UI 系统层与组件层的统一定义）
 * 服务：组件面板 / 画布吸附 / 属性面板 / 代码生成
 *
 * 分层原则：
 * - 系统组件（system: true）：一屏一个，由系统栏统一渲染，不进组件面板
 * - 扩展组件：可复用积木，暴露给用户拖拽
 */
"use strict";

/* ---------- 屏幕模板（系统层，V1 内置） ---------- */
const TEMPLATES = {
  camera: {
    name: "相机取景",
    /* 系统栏：内置在屏幕顶部（标题=屏幕名、时钟、电量），用户不可拖入 */
    systemBar: { height: 44 },
    /* 槽位随工程分辨率计算；rect = [x, y, w, h] */
    slots: (W, H) => ({
      center: {
        name: "取景区", rect: [0, 44, W, H - 44 - 64],
        flow: "row", gap: 20, pad: 8, align: "center", wrap: true,
        allows: ["grid", "focusring", "histogram", "bigbutton", "label"],
      },
      bottombar: {
        name: "底栏", rect: [0, H - 64, W, 64],
        flow: "row", gap: 14, pad: 10, align: "space-evenly",
        allows: ["bigbutton", "mode"], max: 4,
      },
    }),
    defaultPages: ["Screen1"],
  },
};

/* ---------- 组件（组件层） ---------- */
const COMPONENTS = {
  /* 系统组件：不进面板，由系统栏渲染 */
  title:   { name: "标题", icon: "T", kind: "label", system: true, desc: "系统栏左侧，显示屏幕名", propsSchema: [], defaults: {} },
  clock:   { name: "时钟", icon: "🕐", kind: "clock", system: true, desc: "系统栏右侧", propsSchema: [], defaults: {} },
  battery: { name: "电量", icon: "🔋", kind: "battery", system: true, desc: "系统栏右侧", propsSchema: [], defaults: { percent: 86 } },

  /* 扩展组件：暴露给用户 */
  label: {
    name: "文字", icon: "文", kind: "label",
    desc: "任意文字标签",
    propsSchema: [{ key: "text", label: "文字", kind: "text" }],
    defaults: { text: "文字" },
  },
  bigbutton: {
    name: "大按钮", icon: "⬤", kind: "button",
    desc: "圆角大按钮",
    propsSchema: [
      { key: "text", label: "文字", kind: "text" },
      { key: "accent", label: "主色高亮", kind: "boolean" },
    ],
    defaults: { text: "按钮", accent: false },
  },
  mode: {
    name: "模式", icon: "◐", kind: "button",
    desc: "拍照模式切换（拍照/录像/夜景）",
    propsSchema: [
      { key: "text", label: "文字", kind: "text" },
      { key: "accent", label: "主色高亮", kind: "boolean" },
    ],
    defaults: { text: "拍照", accent: true },
  },
  grid: {
    name: "九宫格", icon: "▦", kind: "grid",
    desc: "构图辅助线（系统绘制）",
    propsSchema: [{ key: "visible", label: "显示", kind: "boolean" }],
    defaults: { visible: true },
    unique: true,
  },
  focusring: {
    name: "对焦框", icon: "⌖", kind: "focus",
    desc: "中央对焦框（系统绘制）",
    propsSchema: [],
    defaults: {},
    unique: true,
  },
  histogram: {
    name: "直方图", icon: "📊", kind: "histogram",
    desc: "曝光直方图",
    propsSchema: [{ key: "visible", label: "显示", kind: "boolean" }],
    defaults: { visible: true },
    unique: true,
  },
};

const Registry = { TEMPLATES, COMPONENTS };
