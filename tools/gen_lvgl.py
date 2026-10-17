"""中间 JSON → LVGL 9.x C 代码生成器
用法: python gen_lvgl.py camera-demo.json out/
生成: ui.h / ui.c / screens.h / screens.c / main.c(模拟器入口)
约定: 中文文本使用 ui_font_chinese（需把 ui_font_chinese.c 一并编译）
"""
import json
import sys
import os

W = H = 0

# ---------- 布局常量（对应编辑器的槽位） ----------
TOPBAR_H = 44
BOTTOM_H = 64
LEFT_W = 128


def cstr(s):
    return '"' + str(s).replace("\\", "\\\\").replace('"', '\\"') + '"'


class Gen:
    def __init__(self):
        self.lines = []
        self.n = 0

    def emit(self, s=""):
        self.lines.append(s)

    def var(self, prefix):
        self.n += 1
        return f"{prefix}_{self.n}"


def gen_label(g, parent, text, x=None, y=None, size=None, color="0xffffff", font=True):
    v = g.var("lbl")
    g.emit(f"    lv_obj_t *{v} = lv_label_create({parent});")
    g.emit(f"    lv_label_set_text({v}, {cstr(text)});")
    g.emit(f"    lv_obj_set_style_text_color({v}, lv_color_hex({color}), 0);")
    if font:
        g.emit(f"    lv_obj_set_style_text_font({v}, &ui_font_chinese, 0);")
    if x is not None:
        g.emit(f"    lv_obj_set_pos({v}, {x}, {y});")
    return v


def gen_widget(g, item, parent, page):
    """按组件类型生成 LVGL 创建代码，返回表达式或 None"""
    t = item["type"]
    p = item.get("props", {})

    if t in ("title", "clock", "param"):
        text = {"clock": "10:43"}.get(t) or p.get("text", "")
        return gen_label(g, parent, text)
    if t == "battery":
        return gen_label(g, parent, f"电量 {p.get('percent', 0)}%")
    if t == "histogram":
        v = g.var("hist")
        g.emit(f"    lv_obj_t *{v} = lv_obj_create({parent});")
        g.emit(f"    lv_obj_set_size({v}, 96, 56);")
        g.emit(f"    lv_obj_set_style_bg_color({v}, lv_color_hex(0x000000), 0);")
        g.emit(f"    lv_obj_set_style_bg_opa({v}, LV_OPA_50, 0);")
        g.emit(f"    lv_obj_set_style_radius({v}, 6, 0);")
        return v
    if t == "grid":
        if not p.get("visible", True):
            return None
        # 九宫格：4 条 1px 线，parent 为 center 容器
        cw, ch = W - LEFT_W, H - TOPBAR_H - BOTTOM_H
        for i, (lx, ly, lw, lh) in enumerate([
            (cw // 3, 0, 1, ch), (2 * cw // 3, 0, 1, ch),
            (0, ch // 3, cw, 1), (0, 2 * ch // 3, cw, 1),
        ]):
            v = g.var("line")
            g.emit(f"    lv_obj_t *{v} = lv_obj_create({parent});")
            g.emit(f"    lv_obj_set_pos({v}, {lx}, {ly});")
            g.emit(f"    lv_obj_set_size({v}, {lw}, {lh});")
            g.emit(f"    lv_obj_set_style_bg_color({v}, lv_color_hex(0xffffff), 0);")
            g.emit(f"    lv_obj_set_style_bg_opa({v}, LV_OPA_30, 0);")
            g.emit(f"    lv_obj_set_style_border_width({v}, 0, 0);")
            g.emit(f"    lv_obj_set_style_radius({v}, 0, 0);")
            g.emit(f"    lv_obj_remove_flag({v}, LV_OBJ_FLAG_SCROLLABLE);")
        return None
    if t == "focusbox":
        v = g.var("focus")
        cw, ch = W - LEFT_W, H - TOPBAR_H - BOTTOM_H
        g.emit(f"    lv_obj_t *{v} = lv_obj_create({parent});")
        g.emit(f"    lv_obj_set_size({v}, 80, 80);")
        g.emit(f"    lv_obj_set_pos({v}, {cw // 2 - 40}, {ch // 2 - 40});")
        g.emit(f"    lv_obj_set_style_bg_opa({v}, LV_OPA_0, 0);")
        g.emit(f"    lv_obj_set_style_border_color({v}, lv_color_hex(0xfacc15), 0);")
        g.emit(f"    lv_obj_set_style_border_width({v}, 2, 0);")
        g.emit(f"    lv_obj_set_style_radius({v}, 4, 0);")
        g.emit(f"    lv_obj_remove_flag({v}, LV_OBJ_FLAG_SCROLLABLE);")
        return v
    if t == "bigbutton":
        v = g.var("btn")
        accent = "true" if p.get("accent") else "false"
        g.emit(f"    lv_obj_t *{v} = lv_button_create({parent});")
        g.emit(f"    lv_obj_set_size({v}, 120, 44);")
        if p.get("accent"):
            g.emit(f"    lv_obj_set_style_bg_color({v}, lv_color_hex(0x2563eb), 0);")
        else:
            g.emit(f"    lv_obj_set_style_bg_color({v}, lv_color_hex(0xf5f5f5), 0);")
        g.emit(f"    lv_obj_set_style_radius({v}, 22, 0); /* accent={accent} */")
        lv = gen_label(g, v, p.get("text", "按钮"), color=("0xffffff" if p.get("accent") else "0x1f2937"))
        g.emit(f"    lv_obj_center({lv});")
        return v
    if t == "setting-switch":
        row = g.var("row")
        g.emit(f"    lv_obj_t *{row} = lv_obj_create({parent});")
        g.emit(f"    lv_obj_set_size({row}, LV_PCT(100), 52);")
        g.emit(f"    lv_obj_set_flex_flow({row}, LV_FLEX_FLOW_ROW);")
        g.emit(f"    lv_obj_set_flex_align({row}, LV_FLEX_ALIGN_SPACE_BETWEEN, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);")
        g.emit(f"    lv_obj_set_style_bg_color({row}, lv_color_hex(0x1f2937), 0);")
        g.emit(f"    lv_obj_set_style_radius({row}, 10, 0);")
        g.emit(f"    lv_obj_set_style_border_width({row}, 0, 0);")
        g.emit(f"    lv_obj_set_style_pad_hor({row}, 16, 0);")
        g.emit(f"    lv_obj_remove_flag({row}, LV_OBJ_FLAG_SCROLLABLE);")
        gen_label(g, row, p.get("label", ""))
        sw = g.var("sw")
        g.emit(f"    lv_obj_t *{sw} = lv_switch_create({row});")
        if p.get("on"):
            g.emit(f"    lv_obj_add_state({sw}, LV_STATE_CHECKED);")
        return row
    if t == "setting-slider":
        row = g.var("row")
        g.emit(f"    lv_obj_t *{row} = lv_obj_create({parent});")
        g.emit(f"    lv_obj_set_size({row}, LV_PCT(100), 52);")
        g.emit(f"    lv_obj_set_flex_flow({row}, LV_FLEX_FLOW_ROW);")
        g.emit(f"    lv_obj_set_flex_align({row}, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);")
        g.emit(f"    lv_obj_set_style_bg_color({row}, lv_color_hex(0x1f2937), 0);")
        g.emit(f"    lv_obj_set_style_radius({row}, 10, 0);")
        g.emit(f"    lv_obj_set_style_border_width({row}, 0, 0);")
        g.emit(f"    lv_obj_set_style_pad_hor({row}, 16, 0);")
        g.emit(f"    lv_obj_set_style_pad_column({row}, 12, 0);")
        g.emit(f"    lv_obj_remove_flag({row}, LV_OBJ_FLAG_SCROLLABLE);")
        gen_label(g, row, p.get("label", ""))
        sl = g.var("slider")
        g.emit(f"    lv_obj_t *{sl} = lv_slider_create({row});")
        g.emit(f"    lv_obj_set_flex_grow({sl}, 1);")
        g.emit(f"    lv_slider_set_value({sl}, {int(p.get('value', 0))}, LV_ANIM_OFF);")
        return row
    if t == "setting-option":
        row = g.var("row")
        g.emit(f"    lv_obj_t *{row} = lv_obj_create({parent});")
        g.emit(f"    lv_obj_set_size({row}, LV_PCT(100), 52);")
        g.emit(f"    lv_obj_set_flex_flow({row}, LV_FLEX_FLOW_ROW);")
        g.emit(f"    lv_obj_set_flex_align({row}, LV_FLEX_ALIGN_SPACE_BETWEEN, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);")
        g.emit(f"    lv_obj_set_style_bg_color({row}, lv_color_hex(0x1f2937), 0);")
        g.emit(f"    lv_obj_set_style_radius({row}, 10, 0);")
        g.emit(f"    lv_obj_set_style_border_width({row}, 0, 0);")
        g.emit(f"    lv_obj_set_style_pad_hor({row}, 16, 0);")
        g.emit(f"    lv_obj_remove_flag({row}, LV_OBJ_FLAG_SCROLLABLE);")
        gen_label(g, row, p.get("label", ""))
        gen_label(g, row, str(p.get("value", "")), color="0x9ca3af")
        return row
    if t == "photocell":
        v = g.var("cell")
        g.emit(f"    lv_obj_t *{v} = lv_obj_create({parent});")
        g.emit(f"    lv_obj_set_size({v}, 170, 120);")
        g.emit(f"    lv_obj_set_style_bg_color({v}, lv_color_hex(0x475569), 0);")
        g.emit(f"    lv_obj_set_style_radius({v}, 8, 0);")
        g.emit(f"    lv_obj_set_style_border_width({v}, 0, 0);")
        g.emit(f"    lv_obj_remove_flag({v}, LV_OBJ_FLAG_SCROLLABLE);")
        lv = gen_label(g, v, p.get("label", ""))
        g.emit(f"    lv_obj_align({lv}, LV_ALIGN_BOTTOM_LEFT, 8, -6);")
        return v
    if t == "challengerow":
        row = g.var("row")
        g.emit(f"    lv_obj_t *{row} = lv_obj_create({parent});")
        g.emit(f"    lv_obj_set_size({row}, LV_PCT(100), 64);")
        g.emit(f"    lv_obj_set_style_bg_color({row}, lv_color_hex(0x1f2937), 0);")
        g.emit(f"    lv_obj_set_style_radius({row}, 10, 0);")
        g.emit(f"    lv_obj_set_style_border_width({row}, 0, 0);")
        g.emit(f"    lv_obj_set_style_pad_all({row}, 12, 0);")
        g.emit(f"    lv_obj_remove_flag({row}, LV_OBJ_FLAG_SCROLLABLE);")
        lv = gen_label(g, row, p.get("label", ""))
        g.emit(f"    lv_obj_align({lv}, LV_ALIGN_TOP_LEFT, 0, 0);")
        bar = g.var("bar")
        g.emit(f"    lv_obj_t *{bar} = lv_bar_create({row});")
        g.emit(f"    lv_obj_set_size({bar}, LV_PCT(90), 8);")
        g.emit(f"    lv_obj_align({bar}, LV_ALIGN_BOTTOM_LEFT, 0, 0);")
        g.emit(f"    lv_bar_set_value({bar}, {int(p.get('progress', 0))}, LV_ANIM_OFF);")
        return row
    return None


def slot_container(g, scr, name, x, y, w, h, flow, gap, align="LV_FLEX_ALIGN_START"):
    v = g.var(name)
    g.emit(f"    lv_obj_t *{v} = lv_obj_create({scr});")
    g.emit(f"    lv_obj_set_pos({v}, {x}, {y});")
    g.emit(f"    lv_obj_set_size({v}, {w}, {h});")
    g.emit(f"    lv_obj_set_style_bg_opa({v}, LV_OPA_0, 0);")
    g.emit(f"    lv_obj_set_style_border_width({v}, 0, 0);")
    g.emit(f"    lv_obj_set_style_pad_all({v}, 0, 0);")
    g.emit(f"    lv_obj_set_style_pad_row({v}, {gap}, 0);")
    g.emit(f"    lv_obj_set_style_pad_column({v}, {gap}, 0);")
    g.emit(f"    lv_obj_set_flex_flow({v}, {flow});")
    if flow == "LV_FLEX_FLOW_ROW_WRAP":
        g.emit(f"    lv_obj_set_flex_align({v}, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);")
    else:
        g.emit(f"    lv_obj_set_flex_align({v}, {align}, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);")
    g.emit(f"    lv_obj_remove_flag({v}, LV_OBJ_FLAG_SCROLLABLE);")
    return v


PAGE_TITLES = {"settings": "设置", "album": "相册", "challenge": "挑战"}


def gen_page(g, page_id, items):
    fn = f"create_screen_{page_id}"
    g.emit(f"static lv_obj_t *{fn}(void)")
    g.emit("    {")
    g.emit(f"    lv_obj_t *scr = lv_obj_create(NULL);")
    g.emit(f"    lv_obj_set_style_bg_color(scr, lv_color_hex(0x111827), 0);")
    g.emit(f"    lv_obj_set_style_text_color(scr, lv_color_hex(0xffffff), 0);")
    g.emit(f"    /* 屏幕不可滚动且关闭手势冒泡：手势事件在屏幕层触发换页 */")
    g.emit(f"    lv_obj_remove_flag(scr, LV_OBJ_FLAG_SCROLLABLE | LV_OBJ_FLAG_GESTURE_BUBBLE);")

    by_slot = {}
    for it in items:
        by_slot.setdefault(it["slot"], []).append(it)

    if page_id == "preview":
        top = slot_container(g, "scr", "topbar", 0, 0, W, TOPBAR_H, "LV_FLEX_FLOW_ROW", 12, "LV_FLEX_ALIGN_SPACE_BETWEEN")
        g.emit(f"    lv_obj_set_style_pad_hor({top}, 16, 0);")
        for it in by_slot.get("topbar", []):
            gen_widget(g, it, top, page_id)

        left = slot_container(g, "scr", "leftbar", 0, TOPBAR_H, LEFT_W, H - TOPBAR_H - BOTTOM_H, "LV_FLEX_FLOW_COLUMN", 8)
        g.emit(f"    lv_obj_set_style_pad_all({left}, 10, 0);")
        for it in by_slot.get("leftbar", []):
            gen_widget(g, it, left, page_id)

        # 覆盖层槽位：绝对定位，不用 flex
        v = g.var("center")
        g.emit(f"    lv_obj_t *{v} = lv_obj_create(scr);")
        g.emit(f"    lv_obj_set_pos({v}, {LEFT_W}, {TOPBAR_H});")
        g.emit(f"    lv_obj_set_size({v}, {W - LEFT_W}, {H - TOPBAR_H - BOTTOM_H});")
        g.emit(f"    lv_obj_set_style_bg_opa({v}, LV_OPA_0, 0);")
        g.emit(f"    lv_obj_set_style_border_width({v}, 0, 0);")
        g.emit(f"    lv_obj_set_style_pad_all({v}, 0, 0);")
        g.emit(f"    lv_obj_remove_flag({v}, LV_OBJ_FLAG_SCROLLABLE);")
        center = v
        for it in by_slot.get("center", []):
            gen_widget(g, it, center, page_id)

        bottom = slot_container(g, "scr", "bottombar", 0, H - BOTTOM_H, W, BOTTOM_H, "LV_FLEX_FLOW_ROW", 24, "LV_FLEX_ALIGN_SPACE_EVENLY")
        for it in by_slot.get("bottombar", []):
            gen_widget(g, it, bottom, page_id)
    else:
        # 子页面：标题 + 内容区
        tv = gen_label(g, "scr", PAGE_TITLES.get(page_id, page_id))
        g.emit(f"    lv_obj_align({tv}, LV_ALIGN_TOP_MID, 0, 14);")
        if page_id == "album":
            cont = slot_container(g, "scr", "grid", 32, 56, W - 64, H - 80, "LV_FLEX_FLOW_ROW_WRAP", 14)
        else:
            cont = slot_container(g, "scr", "rows", 64, 64, W - 128, H - 88, "LV_FLEX_FLOW_COLUMN", 10)
        g.emit(f"    lv_obj_add_flag({cont}, LV_OBJ_FLAG_SCROLLABLE); /* 内容可滚动 */")
        g.emit(f"    lv_obj_set_scrollbar_mode({cont}, LV_SCROLLBAR_MODE_AUTO);")
        for it in items:
            gen_widget(g, it, cont, page_id)

    # 手势回调
    g.emit(f"    lv_obj_add_event_cb(scr, gesture_cb, LV_EVENT_GESTURE, NULL);")
    g.emit("    return scr;")
    g.emit("    }")
    g.emit("")
    return fn


def main():
    global W, H
    src = sys.argv[1] if len(sys.argv) > 1 else "camera-demo.json"
    outdir = sys.argv[2] if len(sys.argv) > 2 else "out"
    os.makedirs(outdir, exist_ok=True)
    proj = json.load(open(src, encoding="utf-8"))
    W, H = proj["screen"]["width"], proj["screen"]["height"]
    nav = proj.get("nav", {})
    page_ids = list(proj["pages"].keys())

    # ---------- screens.c ----------
    g = Gen()
    g.emit('/* Auto-generated by gen_lvgl.py — do not edit by hand */')
    g.emit('#include "screens.h"')
    g.emit('#include "ui.h"')
    g.emit("")

    fns = {}
    for pid, items in proj["pages"].items():
        fns[pid] = gen_page(g, pid, items)

    body = "\n".join(g.lines)
    body = body.replace("static lv_obj_t *create_screen_", "lv_obj_t *create_screen_")
    open(os.path.join(outdir, "screens.c"), "w", encoding="utf-8").write(body)

    # ---------- screens.h ----------
    h = ["#ifndef UI_SCREENS_H", "#define UI_SCREENS_H", "", "#include <lvgl/lvgl.h>", "",
         "typedef enum {"]
    h += [f"    SCREEN_ID_{pid.upper()}," for pid in page_ids]
    h += ["} screen_id_t;", ""]
    h += [f"lv_obj_t *create_screen_{pid}(void);" for pid in page_ids]
    h += ["", "void create_screens(void);", "void gesture_cb(lv_event_t *e);", "", "#endif"]
    open(os.path.join(outdir, "screens.h"), "w", encoding="utf-8").write("\n".join(h))

    # ---------- ui.c ----------
    anim = {"left": "LV_SCR_LOAD_ANIM_MOVE_LEFT", "right": "LV_SCR_LOAD_ANIM_MOVE_RIGHT",
            "up": "LV_SCR_LOAD_ANIM_MOVE_TOP", "down": "LV_SCR_LOAD_ANIM_MOVE_BOTTOM"}
    u = []
    u.append('#include "ui.h"')
    u.append('#include "screens.h"')
    u.append("")
    u.append("static lv_obj_t *screens[] = {")
    u += [f"    [{i}] = NULL, /* {pid} */" for i, pid in enumerate(page_ids)]
    u.append("};")
    u.append("")
    u.append("/* 手势导航表 */")
    u.append("typedef struct { uint8_t dir; uint8_t target; } nav_edge_t;")
    u.append("")
    DIR_MAP = {"up": "TOP", "down": "BOTTOM", "left": "LEFT", "right": "RIGHT"}
    for pid in page_ids:
        edges = nav.get(pid, {})
        if not edges:
            continue
        u.append(f"static const nav_edge_t nav_{pid}[] = {{")
        for d, tgt in edges.items():
            u.append(f"    {{ LV_DIR_{DIR_MAP[d]}, SCREEN_ID_{tgt.upper()} }},")
        u.append("};")
        u.append("")
    u.append("void gesture_cb(lv_event_t *e)")
    u.append("{")
    u.append("    lv_obj_t *scr = lv_event_get_current_target(e);")
    u.append("    lv_dir_t dir = lv_indev_get_gesture_dir(lv_indev_active());")
    u.append("    (void)scr;")
    u.append("    int current = -1;")
    u.append("    for (size_t i = 0; i < sizeof(screens)/sizeof(screens[0]); i++)")
    u.append("        if (screens[i] == scr) current = (int)i;")
    u.append("    if (current < 0) return;")
    u.append("")
    u.append("    const nav_edge_t *edges = NULL; size_t n = 0;")
    u.append("    switch ((screen_id_t)current) {")
    for pid in page_ids:
        if nav.get(pid):
            u.append(f"    case SCREEN_ID_{pid.upper()}: edges = nav_{pid}; n = sizeof(nav_{pid})/sizeof(nav_{pid}[0]); break;")
    u.append("    default: return;")
    u.append("    }")
    u.append("")
    u.append("    for (size_t i = 0; i < n; i++) {")
    u.append("        if (edges[i].dir == dir) {")
    u.append("            lv_screen_load_anim_t anim;")
    u.append("            switch (dir) {")
    u.append("            case LV_DIR_LEFT:   anim = LV_SCR_LOAD_ANIM_MOVE_LEFT; break;")
    u.append("            case LV_DIR_RIGHT:  anim = LV_SCR_LOAD_ANIM_MOVE_RIGHT; break;")
    u.append("            case LV_DIR_TOP:    anim = LV_SCR_LOAD_ANIM_MOVE_TOP; break;")
    u.append("            default:          anim = LV_SCR_LOAD_ANIM_MOVE_BOTTOM; break;")
    u.append("            }")
    u.append("            lv_screen_load_anim(screens[edges[i].target], anim, 250, 0, false);")
    u.append("            return;")
    u.append("        }")
    u.append("    }")
    u.append("}")
    u.append("")
    u.append("void create_screens(void)")
    u.append("{")
    for pid in page_ids:
        u.append(f"    screens[SCREEN_ID_{pid.upper()}] = create_screen_{pid}();")
    u.append("}")
    u.append("")
    u.append("void ui_init(void)")
    u.append("{")
    u.append("    create_screens();")
    u.append(f"    lv_screen_load(screens[SCREEN_ID_{page_ids[0].upper()}]);")
    u.append("}")
    u.append("")
    u.append("void ui_tick(void) { /* 周期性 UI 更新可放这里 */ }")
    open(os.path.join(outdir, "ui.c"), "w", encoding="utf-8").write("\n".join(u))

    # ---------- ui.h ----------
    uh = ["#ifndef UI_H", "#define UI_H", "", "#include <lvgl/lvgl.h>", "",
          "extern const lv_font_t ui_font_chinese;", "",
          "void ui_init(void);", "void ui_tick(void);", "", "#endif"]
    open(os.path.join(outdir, "ui.h"), "w", encoding="utf-8").write("\n".join(uh))

    # ---------- screens.c 已完成（create_screen_* 声明在 screens.h） ----------

    # ---------- main.c（LVGL Live Preview / 模拟器入口） ----------
    mc = """#include "ui.h"

/* LVGL Live Preview (VSCode 插件) 入口；固件里请在自己的初始化流程中调用 ui_init() */
#ifdef LVGL_LIVE_PREVIEW
void lvgl_live_preview_init(void)
{
    ui_init();
}
#endif
"""
    open(os.path.join(outdir, "main.c"), "w", encoding="utf-8").write(mc)
    print(f"生成完成 → {outdir}/ ({', '.join(sorted(os.listdir(outdir)))})")


if __name__ == "__main__":
    main()
