/* 槽位编辑器（新建工程模式）逻辑
 * 依赖 registry.js 的 Registry（TEMPLATES / COMPONENTS）
 */
"use strict";

const Proj = {
  project: null,        /* {format, screen, nav, pages, order} */
  screenIdx: 0,
  selected: null,       /* 选中的组件实例 */
  dragType: null,       /* 正在拖的组件类型（新组件） */
  dragMove: null,       /* 正在移动的组件实例 */
  seq: 1,
};

const P$ = id => document.getElementById(id);
const pType = () => Proj.project.order[Proj.screenIdx];
const pScreen = () => Proj.project.pages[pType()];
const tmpl = () => TEMPLATES[Proj.project.screen.template];

/* ---------- 工程创建 / 序列化 ---------- */
function newProject(templateId) {
  const t = TEMPLATES[templateId];
  Proj.seq = 1;
  const pages = {};
  for (const name of t.defaultPages) pages[name] = [];
  Proj.project = {
    format: "snapui@1",
    screen: { ...t.screen, template: templateId },
    nav: {},
    pages,
    order: [...t.defaultPages],
  };
  Proj.screenIdx = 0;
  Proj.selected = null;
  enterProjMode();
  log(`✅ 已新建工程（模板：${t.name}）`);
}

function enterProjMode() {
  $("workspace").style.display = "none";
  $("projWorkspace").style.display = "flex";
  $("toolbar").style.display = "flex";
  $("btnOverview").style.display = "none";   /* 工程模式暂只支持单屏编辑 */
  $("btnImport").style.display = "";
  $("btnSaveProj").style.display = "";
  $("btnExportJson").style.display = "";
  $("btnSim").style.display = "none";       /* 仿真链路待 P0 字体打通后开放 */
  $("btnExportC").style.display = "none";
  $("verBadge").style.display = "";
  $("verBadge").textContent = "新建工程 · " + tmpl().name;
  renderPalette();
  renderProjSidebar();
  renderProjCanvas();
  setViewMode("single");
}

/* ---------- 组件面板 ---------- */
function renderPalette() {
  const pal = P$("palette");
  pal.innerHTML = "<h3>组件</h3>";
  for (const [type, def] of Object.entries(COMPONENTS)) {
    const el = document.createElement("div");
    el.className = "pal-item";
    el.draggable = true;
    el.title = def.desc;
    el.innerHTML = `<span class="pi">${def.icon}</span><span class="pn">${def.name}</span>`;
    el.ondragstart = e => {
      Proj.dragType = type; Proj.dragMove = null;
      e.dataTransfer.setData("text/plain", type);
      e.dataTransfer.effectAllowed = "copy";
      highlightSlots(type);
    };
    el.ondragend = () => clearSlotHighlight();
    pal.appendChild(el);
  }
}

/* 拖拽时高亮合法槽位 */
function highlightSlots(type) {
  document.querySelectorAll("#projScreen .slot").forEach(slot => {
    slot.classList.remove("slot-idle", "slot-dim", "slot-full");
    const sid = slot.dataset.slot;
    const def = tmpl().slots[sid];
    const legal = def.allows.includes(type);
    const count = pScreen().filter(c => c.slot === sid).length;
    if (!legal) slot.classList.add("slot-dim");
    else if (def.max && count >= def.max) slot.classList.add("slot-full");
    else slot.classList.add("slot-hot");
  });
}
function clearSlotHighlight() {
  document.querySelectorAll("#projScreen .slot").forEach(slot => {
    slot.classList.remove("slot-hot", "slot-dim", "slot-full");
    slot.classList.add("slot-idle");
  });
}

/* ---------- 画布 ---------- */
function renderProjCanvas() {
  const t = tmpl();
  const dev = P$("projDevice");
  const wrap = P$("projWrap");
  const scale = Math.min(1, (wrap.clientWidth - 60) / t.screen.width,
                              (wrap.clientHeight - 60) / t.screen.height);
  dev.style.width = t.screen.width * scale + "px";
  dev.style.height = t.screen.height * scale + "px";
  dev.classList.toggle("circle", t.screen.shape === "CIRCLE");
  const scr = P$("projScreen");
  scr.style.transform = `scale(${scale})`;
  scr.style.width = t.screen.width + "px";
  scr.style.height = t.screen.height + "px";
  scr.innerHTML = "";
  for (const [sid, sdef] of Object.entries(t.slots)) {
    const slot = document.createElement("div");
    slot.className = "slot slot-idle";
    slot.dataset.slot = sid;
    slot.style.left = sdef.rect[0] + "px";
    slot.style.top = sdef.rect[1] + "px";
    slot.style.width = sdef.rect[2] + "px";
    slot.style.height = sdef.rect[3] + "px";
    slot.style.gap = (sdef.gap || 0) + "px";
    slot.style.padding = (sdef.pad || 0) + "px";
    slot.style.flexWrap = sdef.wrap ? "wrap" : "nowrap";
    if (sdef.flow === "row") {
      slot.classList.add("flow-row");
      slot.style.alignItems = "center";
      slot.style.justifyContent =
        { "space-between": "space-between", "space-evenly": "space-evenly",
          center: "center", start: "flex-start" }[sdef.align || "start"];
    } else {
      slot.classList.add("flow-column");
      slot.style.justifyContent = "center";
    }
    slot.innerHTML = `<span class="slot-label">${sdef.name}</span>`;
    slot.ondragover = e => {
      e.preventDefault();
      if (slot.classList.contains("slot-hot")) e.dataTransfer.dropEffect = "copy";
    };
    slot.ondrop = e => {
      e.preventDefault();
      onDropToSlot(sid);
      clearSlotHighlight();
    };
    scr.appendChild(slot);
  }
  for (const c of pScreen()) addChip(c);
  updateSlotHints();
}

function updateSlotHints() {
  document.querySelectorAll("#projScreen .slot").forEach(slot => {
    const sid = slot.dataset.slot;
    const has = pScreen().some(c => c.slot === sid);
    let hint = slot.querySelector(".slot-empty-hint");
    if (!has) {
      if (!hint) {
        hint = document.createElement("div");
        hint.className = "slot-empty-hint";
        hint.textContent = "拖入 " + tmpl().slots[sid].allows
          .map(t => COMPONENTS[t].name).join(" / ");
        slot.appendChild(hint);
      }
    } else if (hint) hint.remove();
  });
}

/* 槽内组件渲染 */
function addChip(c) {
  const slot = P$("projScreen").querySelector(`[data-slot="${c.slot}"]`);
  if (!slot) return;
  const el = document.createElement("div");
  el.className = "chip";
  el.dataset.cid = c.id;
  el.draggable = true;
  styleChip(el, c);
  el.onclick = e => { e.stopPropagation(); selectChip(c.id); };
  el.ondragstart = e => {
    Proj.dragMove = c; Proj.dragType = null;
    e.dataTransfer.setData("text/plain", "move:" + c.id);
    highlightSlots(c.type);
  };
  el.ondragend = () => clearSlotHighlight();
  slot.appendChild(el);
}

function styleChip(el, c) {
  const def = COMPONENTS[c.type];
  const p = c.props;
  el.innerHTML = ""; el.className = "chip";
  if (Proj.selected && Proj.selected.id === c.id) el.classList.add("selected");
  if (def.kind === "label" || def.kind === "clock") {
    el.style.color = "#fff"; el.style.fontSize = "14px"; el.style.whiteSpace = "nowrap";
    el.style.padding = "0 4px";
    el.textContent = def.kind === "clock"
      ? (p.format === "12h" ? "10:43 AM" : "10:43") : (p.text || "");
  } else if (def.kind === "battery") {
    el.style.color = "#fff"; el.style.fontSize = "13px";
    el.textContent = `▮ ${p.percent ?? 0}%`;
  } else if (def.kind === "button") {
    el.style.padding = "0 18px"; el.style.height = "40px"; el.style.borderRadius = "20px";
    el.style.fontSize = "14px";
    if (p.accent) { el.style.background = "#3d6df5"; el.style.color = "#fff"; }
    else { el.style.background = "#2a2a2e"; el.style.color = "#e5e7eb"; }
    el.textContent = p.text || "";
  } else if (def.kind === "grid") {
    el.style.width = "120px"; el.style.height = "120px";
    el.style.background =
      "repeating-linear-gradient(0deg,transparent 0 39px,rgba(255,255,255,.35) 39px 40px)," +
      "repeating-linear-gradient(90deg,transparent 0 39px,rgba(255,255,255,.35) 39px 40px)";
  } else if (def.kind === "focus") {
    el.style.width = "84px"; el.style.height = "84px";
    el.style.border = "2px solid #facc15"; el.style.borderRadius = "6px";
    el.innerHTML = `<span style="position:absolute;top:-2px;left:-2px;width:14px;height:14px;border-top:3px solid #facc15;border-left:3px solid #facc15"></span>
      <span style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;border-bottom:3px solid #facc15;border-right:3px solid #facc15"></span>`;
  } else if (def.kind === "histogram") {
    el.style.width = "110px"; el.style.height = "64px";
    el.style.background = "rgba(255,255,255,.08)"; el.style.borderRadius = "6px";
    el.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
      <polyline points="0,35 12,30 25,32 38,20 52,24 66,12 80,16 100,6" fill="none" stroke="#34d399" stroke-width="2"/></svg>`;
  }
}

function onDropToSlot(sid) {
  const sdef = tmpl().slots[sid];
  /* 移动已有组件 */
  if (Proj.dragMove) {
    const c = Proj.dragMove;
    if (!sdef.allows.includes(c.type)) return log(`❌ ${COMPONENTS[c.type].name} 不能放入「${sdef.name}」`);
    c.slot = sid;
    Proj.dragMove = null;
    refreshCanvas();
    return;
  }
  /* 新组件 */
  const type = Proj.dragType;
  if (!type) return;
  if (!sdef.allows.includes(type)) return;
  const count = pScreen().filter(c => c.slot === sid).length;
  if (sdef.max && count >= sdef.max) return log(`❌ 「${sdef.name}」已满（最多 ${sdef.max} 个）`);
  const def = COMPONENTS[type];
  if (def.unique && pScreen().some(c => c.type === type))
    if (!confirm(`「${def.name}」全屏唯一，将替换已有实例，继续？`))
      return;
  if (def.unique) {
    for (let i = pScreen().length - 1; i >= 0; i--)
      if (pScreen()[i].type === type) pScreen().splice(i, 1);
  }
  const c = { id: "c" + Proj.seq++, type, slot: sid, props: { ...def.defaults } };
  pScreen().push(c);
  Proj.dragType = null;
  refreshCanvas();
  selectChip(c.id);
}

function refreshCanvas() {
  renderProjCanvas();
  renderProjSidebar();
}

function selectChip(cid) {
  Proj.selected = pScreen().find(c => c.id === cid) || null;
  document.querySelectorAll("#projScreen .chip").forEach(el => {
    const c = pScreen().find(x => x.id === el.dataset.cid);
    el.classList.toggle("selected", !!Proj.selected && el.dataset.cid === cid);
    if (c) styleChip(el, c);
  });
  renderPropPanel();
}

/* ---------- 属性面板 ---------- */
function renderPropPanel() {
  const panel = P$("propPanel");
  const c = Proj.selected;
  if (!c) { panel.style.display = "none"; return; }
  panel.style.display = "flex";
  const def = COMPONENTS[c.type];
  let html = `<h3>${def.icon} ${def.name}</h3><div style="padding:0 14px 6px;font-size:11px;color:var(--text-3)">${def.desc}</div>`;
  for (const f of def.propsSchema) {
    const v = c.props[f.key];
    if (f.kind === "boolean") {
      html += `<div class="prop-row"><label><input type="checkbox" data-k="${f.key}" ${v ? "checked" : ""}> ${f.label}</label></div>`;
    } else if (f.kind === "select") {
      html += `<div class="prop-row"><label>${f.label}</label><select data-k="${f.key}">` +
        f.options.map(o => `<option ${o === v ? "selected" : ""}>${o}</option>`).join("") + `</select></div>`;
    } else {
      const t = f.kind === "number" ? "number" : "text";
      html += `<div class="prop-row"><label>${f.label}</label><input type="${t}" data-k="${f.key}" value="${v ?? ""}"></div>`;
    }
  }
  html += `<div class="prop-btns"><button class="prop-del" id="btnDelChip">删除组件</button></div>`;
  panel.innerHTML = html;
  panel.querySelectorAll("[data-k]").forEach(inp => {
    inp.oninput = () => {
      const k = inp.dataset.k;
      c.props[k] = inp.type === "checkbox" ? inp.checked
        : inp.type === "number" ? Number(inp.value) : inp.value;
      const chipEl = P$("projScreen").querySelector(`[data-cid="${c.id}"]`);
      if (chipEl) styleChip(chipEl, c);
    };
  });
  P$("btnDelChip").onclick = () => {
    const i = pScreen().findIndex(x => x.id === c.id);
    if (i >= 0) pScreen().splice(i, 1);
    Proj.selected = null;
    refreshCanvas();
    renderPropPanel();
  };
}

/* ---------- 屏幕侧栏 ---------- */
function renderProjSidebar() {
  const list = P$("projPageList");
  list.innerHTML = "";
  Proj.project.order.forEach((pid, i) => {
    const el = document.createElement("div");
    el.className = "page-item" + (i === Proj.screenIdx ? " active" : "");
    const n = Proj.project.pages[pid].length;
    el.innerHTML = `<span>🖥</span> ${pid} <span class="cnt">${n}</span>`;
    el.onclick = () => {
      Proj.screenIdx = i; Proj.selected = null;
      refreshCanvas(); renderPropPanel(); setViewMode("single");
    };
    list.appendChild(el);
  });
  const add = document.createElement("div");
  add.className = "page-item";
  add.style.color = "var(--text-3)";
  add.innerHTML = `<span>＋</span> 新建屏幕`;
  add.onclick = () => {
    let name = "Screen" + (Proj.project.order.length + 1);
    while (Proj.project.pages[name]) name += "x";
    Proj.project.pages[name] = [];
    Proj.project.order.push(name);
    Proj.screenIdx = Proj.project.order.length - 1;
    refreshCanvas(); renderPropPanel(); setViewMode("single");
  };
  list.appendChild(add);
}

/* ---------- 保存 / 加载 ---------- */
function saveProject() {
  const json = JSON.stringify(Proj.project, null, 2);
  window.pywebview.api.save_text("project.snapui.json", json).then(r => {
    log(r ? "✅ 工程已保存：" + r : "已取消");
  });
}

function loadProjectJson(json) {
  if (!json.format || !json.pages) { log("❌ 不是有效的 SnapUI 工程文件"); return; }
  Proj.project = json;
  Proj.screenIdx = 0;
  Proj.selected = null;
  /* 兼容无 order 字段的旧文件 */
  if (!Proj.project.order) Proj.project.order = Object.keys(Proj.project.pages);
  enterProjMode();
  log(`✅ 已加载工程：${Proj.project.order.length} 个屏幕`);
}
