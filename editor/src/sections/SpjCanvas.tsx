import { useRef, useState } from "react";
import type { SpjPage, SpjProject, SpjWidget } from "@/lib/spj";
import { rgba } from "@/lib/spj";

interface Props {
  project: SpjProject;
  onChange: (p: SpjProject) => void;
}

/** 单个组件的视觉还原 */
function WidgetView({
  w,
  selected,
  onPointerDown,
}: {
  w: SpjWidget;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent, w: SpjWidget) => void;
}) {
  const s = w.style;
  const base: React.CSSProperties = {
    position: "absolute",
    left: w.x,
    top: w.y,
    width: w.w,
    height: w.h,
    cursor: "move",
    outline: selected ? "2px solid #3b82f6" : undefined,
    outlineOffset: 1,
  };

  let body: React.ReactNode = null;
  switch (w.type) {
    case "LABEL":
      body = (
        <span
          style={{
            color: rgba(s.textColor, "#fff"),
            fontSize: Math.min(w.h > 1 ? w.h : 16, 28),
            whiteSpace: "nowrap",
          }}
        >
          {w.text}
        </span>
      );
      break;
    case "BUTTON":
      body = (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: rgba(s.bgColor, "#2196f3"),
            borderRadius: s.radius ?? 8,
            border: s.borderWidth ? `${s.borderWidth}px solid ${rgba(s.borderColor)}` : undefined,
          }}
        >
          {w.children.length === 0 && w.text && (
            <span style={{ color: rgba(s.textColor, "#fff"), fontSize: 14 }}>{w.text}</span>
          )}
        </div>
      );
      break;
    case "ARC": {
      const [min, max] = w.range ?? [0, 100];
      const v = w.value ?? min;
      const ratio = (v - min) / (max - min || 1);
      const r = Math.min(w.w, w.h) / 2 - 8;
      const cx = w.w / 2;
      const cy = w.h / 2;
      const circ = 2 * Math.PI * r;
      body = (
        <svg width={w.w} height={w.h}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={10} />
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={rgba(s.bgColor, "#2196f3")} strokeWidth={10} strokeLinecap="round"
            strokeDasharray={`${circ * ratio * 0.75} ${circ}`}
            transform={`rotate(135 ${cx} ${cy})`}
          />
        </svg>
      );
      break;
    }
    case "SLIDER": {
      const [min, max] = w.range ?? [0, 100];
      const v = w.value ?? min;
      const ratio = (v - min) / (max - min || 1);
      body = (
        <div className="w-full h-full flex items-center">
          <div className="w-full h-1.5 rounded-full bg-white/20 relative">
            <div className="absolute left-0 top-0 bottom-0 rounded-full bg-blue-400" style={{ width: `${ratio * 100}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow"
              style={{ left: `${ratio * 100}%` }}
            />
          </div>
        </div>
      );
      break;
    }
    case "CHART":
      body = (
        <div
          className="w-full h-full relative overflow-hidden"
          style={{
            background: rgba(s.bgColor, "rgba(255,255,255,0.06)"),
            borderRadius: s.radius ?? 4,
          }}
        >
          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 50">
            <polyline
              points="0,40 15,32 30,36 45,22 60,28 75,14 90,20 100,10"
              fill="none" stroke="#34d399" strokeWidth="2"
            />
          </svg>
        </div>
      );
      break;
    case "SWITCH":
      body = (
        <div className="w-full h-full rounded-full bg-gray-500 relative">
          <div className="absolute top-0.5 left-0.5 w-[26px] h-[26px] bg-white rounded-full shadow" />
        </div>
      );
      break;
    default:
      body = (
        <div
          className="w-full h-full flex items-center justify-center text-[10px] text-white/70"
          style={{ background: rgba(s.bgColor, "rgba(255,255,255,0.12)"), borderRadius: s.radius ?? 4 }}
        >
          {w.name}
        </div>
      );
  }

  return (
    <div style={base} onPointerDown={(e) => onPointerDown(e, w)}>
      {body}
      {w.children.map((c) => (
        <WidgetView key={c.name + c.x + c.y} w={c} selected={false} onPointerDown={() => {}} />
      ))}
    </div>
  );
}

/** 导入的 SPJ 工程画布：按原始分辨率渲染，组件可拖动 */
export default function SpjCanvas({ project, onChange }: Props) {
  const [pageIdx, setPageIdx] = useState(0);
  const [selected, setSelected] = useState<SpjWidget | null>(null);
  const dragRef = useRef<{ w: SpjWidget; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const page: SpjPage | undefined = project.pages[pageIdx];
  const scale = Math.min(1, 900 / project.width, 600 / project.height);

  const onPointerDown = (e: React.PointerEvent, w: SpjWidget) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { w, sx: e.clientX, sy: e.clientY, ox: w.x, oy: w.y };
    setSelected(w);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    // 5px 网格吸附
    d.w.x = Math.round((d.ox + (e.clientX - d.sx) / scale) / 5) * 5;
    d.w.y = Math.round((d.oy + (e.clientY - d.sy) / scale) / 5) * 5;
    onChange({ ...project });
  };

  const onPointerUp = () => (dragRef.current = null);

  /** 从组件库拖入新组件：落到鼠标位置并网格吸附 */
  const onDropComponent = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("component-type");
    if (!type || !page || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / scale / 5) * 5;
    const y = Math.round((e.clientY - rect.top) / scale / 5) * 5;

    // 编辑器组件 → SPJ 组件映射
    let w: SpjWidget | null = null;
    const base = { style: {}, children: [] };
    if (["title", "clock", "param", "battery"].includes(type)) {
      const text = { title: "标题", clock: "10:43", battery: "电量 86%", param: "ISO 100" }[type]!;
      w = { ...base, type: "LABEL", name: "新标签", x, y, w: 120, h: 24, text };
    } else if (type === "bigbutton") {
      w = { ...base, type: "BUTTON", name: "新按钮", x, y, w: 120, h: 44, style: { bgColor: [37, 99, 235, 255], radius: 22 }, children: [] };
      w.children = [{ type: "LABEL", name: "label", x: 0, y: 0, w: 40, h: 20, text: "按钮", style: {}, children: [] }];
    } else if (type === "setting-switch") {
      w = { ...base, type: "SWITCH", name: "新开关", x, y, w: 60, h: 30 };
    } else if (type === "setting-slider") {
      w = { ...base, type: "SLIDER", name: "新滑块", x, y, w: 200, h: 14, range: [0, 100], value: 50 };
    } else if (type === "histogram") {
      w = { ...base, type: "CHART", name: "图表", x, y, w: 200, h: 110 };
    } else if (type === "photocell") {
      w = { ...base, type: "PANEL", name: "照片", x, y, w: 170, h: 120, style: { bgColor: [71, 85, 105, 255], radius: 8 } };
    }
    if (!w) return;
    page.widgets.push(w);
    onChange({ ...project });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
        <span className="text-xs text-gray-400">
          SquareLine {project.editorVersion} · {project.width}×{project.height} {project.shape}
        </span>
        {project.pages.map((p, i) => (
          <button
            key={p.name}
            onClick={() => { setPageIdx(i); setSelected(null); }}
            className={`px-3 py-1 text-xs rounded-md ${
              i === pageIdx ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {p.name}
          </button>
        ))}
        <div className="flex-1" />
        {selected && (
          <span className="text-xs text-gray-500">
            {selected.name} · x={Math.round(selected.x)} y={Math.round(selected.y)} · {selected.w}×{selected.h}
          </span>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center bg-gray-100 overflow-auto p-6">
        <div
          ref={canvasRef}
          className="relative shadow-2xl shrink-0"
          style={{
            width: project.width * scale,
            height: project.height * scale,
            borderRadius: project.shape === "CIRCLE" ? "50%" : 8,
            overflow: "hidden",
            background: rgba(page?.bgColor, "#111"),
          }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => setSelected(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropComponent}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: project.width, height: project.height, position: "relative" }}>
            {page?.widgets.map((w) => (
              <WidgetView key={w.name} w={w} selected={selected === w} onPointerDown={onPointerDown} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
