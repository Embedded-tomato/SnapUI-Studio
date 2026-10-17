/** SquareLine .spj 解析器（浏览器端）
 * .spj 是纯 JSON：root → 屏幕(isPage) → 组件树，属性为 nid/strtype/strval/intarray 结构
 */

export interface SpjStyle {
  bgColor?: [number, number, number, number];
  radius?: number;
  textColor?: [number, number, number, number];
  borderColor?: [number, number, number, number];
  borderWidth?: number;
  opa?: number;
}

export interface SpjWidget {
  type: string;
  name: string;
  x: number; // 相对父级的绝对偏移（已按 align 换算）
  y: number;
  w: number;
  h: number;
  text?: string;
  value?: number;
  range?: [number, number];
  style: SpjStyle; // DEFAULT 状态
  pressedStyle?: SpjStyle;
  children: SpjWidget[];
}

export interface SpjPage {
  name: string;
  widgets: SpjWidget[];
  bgColor?: [number, number, number, number];
}

export interface SpjProject {
  editorVersion: string;
  width: number;
  height: number;
  shape: string;
  pages: SpjPage[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = any;

function prop(node: Node, strtype: string): Node | undefined {
  return (node.properties ?? []).find((p: Node) => p.strtype === strtype);
}

function pval(node: Node, strtype: string): unknown {
  const p = prop(node, strtype);
  if (!p) return undefined;
  return p.strval ?? p.intarray ?? p.floatval ?? p.flags;
}

/** 从样式节点提取 DEFAULT / PRESSED 状态的关键视觉属性 */
function parseStyle(node: Node, strtype: string): { def: SpjStyle; pressed?: SpjStyle } {
  const p = prop(node, strtype);
  const def: SpjStyle = {};
  let pressed: SpjStyle | undefined;
  if (!p) return { def };
  for (const state of p.childs ?? []) {
    const stateName: string = state.strval ?? "DEFAULT";
    const s: SpjStyle = {};
    for (const f of state.childs ?? []) {
      const key: string = (f.strtype ?? "").split("/").pop() ?? "";
      if (key === "Bg_Color" && f.intarray) s.bgColor = f.intarray;
      else if (key === "Radius" && f.intarray) s.radius = f.intarray[0];
      else if (key === "Text_Color" && f.intarray) s.textColor = f.intarray;
      else if (key === "Border_Color" && f.intarray) s.borderColor = f.intarray;
      else if (key === "Border_Width" && f.intarray) s.borderWidth = f.intarray[0];
      else if (key === "Bg_Opa" && f.intarray) s.opa = f.intarray[0];
    }
    if (stateName === "PRESSED") pressed = s;
    else if (stateName === "DEFAULT") Object.assign(def, s);
  }
  return { def, pressed };
}

/** LVGL 对齐语义：组件锚点对齐到父级锚点，再加偏移 */
const ANCHORS: Record<string, [number, number]> = {
  TOP_LEFT: [0, 0], TOP_MID: [0.5, 0], TOP_RIGHT: [1, 0],
  LEFT_MID: [0, 0.5], CENTER: [0.5, 0.5], RIGHT_MID: [1, 0.5],
  BOTTOM_LEFT: [0, 1], BOTTOM_MID: [0.5, 1], BOTTOM_RIGHT: [1, 1],
};

function alignOffset(node: Node, pw: number, ph: number, w: number, h: number): [number, number] {
  const align = (pval(node, "OBJECT/Align") as string) ?? "TOP_LEFT";
  const pos = (pval(node, "OBJECT/Position") as number[]) ?? [0, 0];
  const a = ANCHORS[align] ?? ANCHORS.TOP_LEFT;
  return [
    a[0] * pw - a[0] * w + (pos[0] ?? 0),
    a[1] * ph - a[1] * h + (pos[1] ?? 0),
  ];
}

function parseWidget(node: Node, pw: number, ph: number): SpjWidget | null {
  const type: string = node.saved_objtypeKey ?? "UNKNOWN";
  if (type === "STARTEVENTS") return null;
  const size = (pval(node, "OBJECT/Size") as number[]) ?? [50, 30];
  const [x, y] = alignOffset(node, pw, ph, size[0] ?? 50, size[1] ?? 30);
  const { def, pressed } = parseStyle(node, `${type}/Style_main`);
  const w: SpjWidget = {
    type,
    name: (pval(node, "OBJECT/Name") as string) ?? type,
    x, y, w: size[0] ?? 50, h: size[1] ?? 30,
    style: def,
    pressedStyle: pressed,
    children: [],
  };
  if (type === "LABEL") w.text = pval(node, "LABEL/Text") as string;
  if (type === "BUTTON") w.text = pval(node, "BUTTON/Text") as string;
  if (type === "ARC" || type === "SLIDER") {
    w.range = pval(node, `${type}/Range`) as [number, number];
    w.value = pval(node, `${type}/Value`) as number;
  }
  for (const c of node.children ?? []) {
    const cw = parseWidget(c, w.w, w.h);
    if (cw) w.children.push(cw);
  }
  return w;
}

export function parseSpj(json: Node): SpjProject {
  const info = json.info ?? {};
  const W = info.width ?? 800;
  const H = info.height ?? 480;
  const pages: SpjPage[] = [];
  for (const screen of json.root?.children ?? []) {
    if (!screen.isPage) continue;
    const { def } = parseStyle(screen, "SCREEN/Style_main");
    const page: SpjPage = {
      name: (pval(screen, "SCREEN/Screen") as string) ?? (pval(screen, "OBJECT/Name") as string) ?? "Screen",
      widgets: [],
      bgColor: def.bgColor,
    };
    for (const c of screen.children ?? []) {
      const w = parseWidget(c, W, H);
      if (w) page.widgets.push(w);
    }
    pages.push(page);
  }
  return {
    editorVersion: info.editor_version ?? "",
    width: W,
    height: H,
    shape: info.shape ?? "RECT",
    pages,
  };
}

export function rgba(c?: [number, number, number, number], fallback = "transparent"): string {
  if (!c) return fallback;
  return `rgba(${c[0]},${c[1]},${c[2]},${(c[3] ?? 255) / 255})`;
}
