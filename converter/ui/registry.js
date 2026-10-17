/* SnapUI 注册表：模板 + 槽位 + 组件（UI 系统层与组件层的统一定义）
 * 服务：组件面板 / 画布吸附 / 属性面板 / 代码生成
 */
"use strict";

/* ---------- 屏幕模板（系统层，V1 内置） ---------- */
const TEMPLATES = {
  camera: {
    name: "相机取景",
    screen: { width: 480, height: 480, shape: "RECT" },
    slots: {
      topbar: {
        name: "顶栏", rect: [0, 0, 480, 44],
        flow: "row", gap: 8, pad: 12, align: "space-between",
        allows: ["title", "clock", "battery", "status"], max: 4,
      },
      center: {
        name: "取景区", rect: [0, 44, 480, 372],
        flow: "row", gap: 20, pad: 0, align: "center", wrap: true,
        allows: ["grid", "focusring", "histogram", "bigbutton", "label"],
      },
      bottombar: {
        name: "底栏", rect: [0, 416, 480, 64],
        flow: "row", gap: 14, pad: 10, align: "space-evenly",
        allows: ["bigbutton", "mode"], max: 4,
      },
    },
    /* 新建工程时的默认页面 */
    defaultPages: ["Screen1"],
  },
};

/* ---------- 组件（组件层） ---------- */
/* kind 决定画布和属性面板的渲染方式；propsSchema 驱动属性表单 */
const COMPONENTS = {
  title: {
    name: "标题", icon: "T", kind: "label",
    desc: "页面标题文字",
    propsSchema: [
      { key: "text", label: "文字", kind: "text" },
    ],
    defaults: { text: "拍照" },
  },
  label: {
    name: "文字", icon: "文", kind: "label",
    desc: "任意文字标签",
    propsSchema: [{ key: "text", label: "文字", kind: "text" }],
    defaults: { text: "文字" },
  },
  clock: {
    name: "时钟", icon: "🕐", kind: "clock",
    desc: "当前时间",
    propsSchema: [{ key: "format", label: "格式", kind: "select", options: ["24h", "12h"] }],
    defaults: { format: "24h" },
  },
  battery: {
    name: "电量", icon: "🔋", kind: "battery",
    desc: "电池百分比",
    propsSchema: [{ key: "percent", label: "百分比", kind: "number", min: 0, max: 100 }],
    defaults: { percent: 86 },
  },
  status: {
    name: "状态", icon: "●", kind: "label",
    desc: "录制/存储状态小字",
    propsSchema: [{ key: "text", label: "文字", kind: "text" }],
    defaults: { text: "REC" },
  },
  bigbutton: {
    name: "大按钮", icon: "⬤", kind: "button",
    desc: "圆形/圆角大按钮",
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

/* 组件允许落入的槽位 = 模板槽位 allows 的反向索引由调用方计算 */

const Registry = { TEMPLATES, COMPONENTS };
