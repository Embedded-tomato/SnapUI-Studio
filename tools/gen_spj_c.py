"""SPJ 中间 JSON（parse_spj 输出格式）→ LVGL 9.x C 代码（绝对布局）
用法: python gen_spj_c.py imported.json outdir/
"""
import json
import os
import sys


def color(c, fallback="0x333333"):
    if not c:
        return fallback
    return "0x%02x%02x%02x" % (c[0], c[1], c[2])


def cstr(s):
    return '"' + str(s or "").replace("\\", "\\\\").replace('"', '\\"') + '"'


class G:
    def __init__(self):
        self.lines = []
        self.n = 0

    def e(self, s=""):
        self.lines.append(s)

    def v(self, p):
        self.n += 1
        return f"{p}_{self.n}"


def style_common(g, v, w, images=None):
    s = w.get("style", {})
    if images is not None and s.get("bgImage"):
        key = os.path.basename(s["bgImage"]).rsplit(".", 1)[0]
        images[key] = s["bgImage"]
        # 样式背景图改用真实 lv_image 铺满（RAW PNG 在样式背景路径不渲染，用已验证路径）
        bg = g.v("bgimg")
        g.e(f"    lv_obj_t *{bg} = lv_image_create({v});")
        g.e(f"    lv_image_set_src({bg}, &img_{key});")
        g.e(f"    lv_obj_set_size({bg}, LV_PCT(100), LV_PCT(100));")
        g.e(f"    lv_image_set_inner_align({bg}, LV_IMAGE_ALIGN_STRETCH);")
    if s.get("bgColor"):
        g.e(f"    lv_obj_set_style_bg_color({v}, lv_color_hex({color(s['bgColor'])}), 0);")
        g.e(f"    lv_obj_set_style_bg_opa({v}, LV_OPA_COVER, 0);")
    if s.get("radius") is not None:
        g.e(f"    lv_obj_set_style_radius({v}, {s['radius']}, 0);")
    if s.get("borderWidth"):
        g.e(f"    lv_obj_set_style_border_width({v}, {s['borderWidth']}, 0);")
        g.e(f"    lv_obj_set_style_border_color({v}, lv_color_hex({color(s.get('borderColor'), '0x888888')}), 0);")


def gen_widget(g, w, parent, by_name, images):
    t = w["type"]
    x, y, ww, hh = round(w["x"]), round(w["y"]), round(w["w"]), round(w["h"])
    name = w.get("name", t)

    if t == "IMAGE":
        v = g.v("img")
        asset = w.get("asset", "")
        key = os.path.basename(asset).rsplit(".", 1)[0]
        images[key] = asset
        g.e(f"    lv_obj_t *{v} = lv_image_create({parent});")
        g.e(f"    lv_image_set_src({v}, &img_{key});")
        if w.get("align"):
            off = w.get("posOffset") or [0, 0]
            g.e(f"    lv_obj_align({v}, LV_ALIGN_{w['align']}, {off[0]}, {off[1]});")
        else:
            g.e(f"    lv_obj_set_pos({v}, {x}, {y});")
        if w.get("pivot"):
            g.e(f"    lv_image_set_pivot({v}, {w['pivot'][0]}, {w['pivot'][1]});")
        if w.get("rotation"):
            g.e(f"    lv_image_set_rotation({v}, {int(w['rotation'])}); /* 0.1 度单位 */")
        if w.get("scale") and int(w["scale"]) != 256:
            g.e(f"    lv_image_set_scale({v}, {int(w['scale'])}); /* 256=100% */")
        return
    safe = "w" + str(abs(hash(name)) % 100000)

    if t == "LABEL":
        v = g.v("lbl")
        g.e(f"    lv_obj_t *{v} = lv_label_create({parent});")
        g.e(f"    lv_label_set_text({v}, {cstr(w.get('text'))});")
        if w.get("align") and w.get("w", 1) <= 1:
            off = w.get("posOffset") or [0, 0]
            g.e(f"    lv_obj_align({v}, LV_ALIGN_{w['align']}, {off[0]}, {off[1]});")
        else:
            g.e(f"    lv_obj_set_pos({v}, {x}, {y});")
        if w["style"].get("textColor"):
            g.e(f"    lv_obj_set_style_text_color({v}, lv_color_hex({color(w['style']['textColor'])}), 0);")
    elif t == "BUTTON":
        v = g.v("btn")
        g.e(f"    lv_obj_t *{v} = lv_button_create({parent});")
        g.e(f"    lv_obj_set_pos({v}, {x}, {y});")
        g.e(f"    lv_obj_set_size({v}, {ww}, {hh});")
        style_common(g, v, w, images)
    elif t == "ARC":
        v = g.v("arc")
        r = w.get("range") or [0, 100]
        g.e(f"    lv_obj_t *{v} = lv_arc_create({parent});")
        g.e(f"    lv_obj_set_pos({v}, {x}, {y});")
        g.e(f"    lv_obj_set_size({v}, {ww}, {hh});")
        g.e(f"    lv_arc_set_range({v}, {r[0]}, {r[1]});")
        g.e(f"    lv_arc_set_value({v}, {int(w.get('value') or 0)});")
        style_common(g, v, w, images)
    elif t == "SLIDER":
        v = g.v("sld")
        r = w.get("range") or [0, 100]
        g.e(f"    lv_obj_t *{v} = lv_slider_create({parent});")
        g.e(f"    lv_obj_set_pos({v}, {x}, {y});")
        g.e(f"    lv_obj_set_size({v}, {ww}, {hh});")
        g.e(f"    lv_slider_set_range({v}, {r[0]}, {r[1]});")
        g.e(f"    lv_slider_set_value({v}, {int(w.get('value') or 0)}, LV_ANIM_OFF);")
    elif t == "SWITCH":
        v = g.v("sw")
        g.e(f"    lv_obj_t *{v} = lv_switch_create({parent});")
        g.e(f"    lv_obj_set_pos({v}, {x}, {y});")
        g.e(f"    lv_obj_set_size({v}, {ww}, {hh});")
    elif t == "CHART":
        v = g.v("chart")
        g.e(f"    lv_obj_t *{v} = lv_chart_create({parent});")
        g.e(f"    lv_obj_set_pos({v}, {x}, {y});")
        g.e(f"    lv_obj_set_size({v}, {ww}, {hh});")
        g.e(f"    lv_chart_set_type({v}, LV_CHART_TYPE_LINE);")
        style_common(g, v, w, images)
    else:  # PANEL / IMAGE / 其他 → 容器
        v = g.v("obj")
        g.e(f"    lv_obj_t *{v} = lv_obj_create({parent});")
        g.e(f"    lv_obj_set_pos({v}, {x}, {y});")
        g.e(f"    lv_obj_set_size({v}, {ww}, {hh});")
        style_common(g, v, w, images)
        g.e(f"    lv_obj_remove_flag({v}, LV_OBJ_FLAG_SCROLLABLE);")

    by_name[name] = v
    for c in w.get("children", []):
        gen_widget(g, c, v, by_name, images)


def generate(project: dict, outdir: str, assets_root: str = ""):
    os.makedirs(outdir, exist_ok=True)
    pages = project["pages"]
    images = {}  # key -> 相对路径

    g = G()
    g.e("/* Auto-generated by gen_spj_c.py */")
    g.e('#include "ui.h"')
    g.e("")
    for pg in pages:
        pid = "".join(c if c.isalnum() else "_" for c in str(pg["name"])).lower()
        g.e(f"lv_obj_t *create_screen_{pid}(void)")
        g.e("{")
        g.e("    lv_obj_t *scr = lv_obj_create(NULL);")
        if pg.get("bgColor"):
            g.e(f"    lv_obj_set_style_bg_color(scr, lv_color_hex({color(pg['bgColor'])}), 0);")
        else:
            g.e("    lv_obj_set_style_bg_color(scr, lv_color_hex(0x111111), 0);")
        g.e("    lv_obj_set_style_text_color(scr, lv_color_hex(0xffffff), 0);")
        g.e("    lv_obj_remove_flag(scr, LV_OBJ_FLAG_SCROLLABLE | LV_OBJ_FLAG_GESTURE_BUBBLE);")
        g.e("    lv_obj_add_event_cb(scr, gesture_cb, LV_EVENT_GESTURE, NULL);")
        by_name = {}
        for w in pg["widgets"]:
            gen_widget(g, w, "scr", by_name, images)
        g.e("    return scr;")
        g.e("}")
        g.e("")

    # ---------- 图片资源内嵌（PNG 字节 → C 数组，运行时 lodepng 解码） ----------
    prolog = []
    if images:
        prolog.append("/* 内嵌图片资源 */")
        for key, rel in images.items():
            path = os.path.join(assets_root, rel.replace("/", os.sep))
            if not os.path.exists(path):
                alt = os.path.join(assets_root, "assets", os.path.basename(rel))
                path = alt if os.path.exists(alt) else path
            if not os.path.exists(path):
                base = os.path.basename(rel)
                for root, _, files in os.walk(assets_root):
                    if base in files:
                        path = os.path.join(root, base)
                        break
            if not os.path.exists(path):
                prolog.append(f"/* 警告: 找不到资源 {rel} */")
                continue
            from PIL import Image
            import numpy as np
            im = Image.open(path).convert("RGBA")
            iw, ih = im.size
            px = np.array(im, dtype=np.uint8)
            bgra = px[:, :, [2, 1, 0, 3]]  # 内存序 B,G,R,A = 小端 ARGB8888
            arr = ",".join(map(str, bgra.tobytes()))
            prolog.append(f"static const uint8_t img_{key}_data[] = {{{arr}}};")
            prolog.append(f"const lv_image_dsc_t img_{key} = {{")
            prolog.append(f"    .header.magic = LV_IMAGE_HEADER_MAGIC,")
            prolog.append(f"    .header.cf = LV_COLOR_FORMAT_ARGB8888,")
            prolog.append(f"    .header.w = {iw},")
            prolog.append(f"    .header.h = {ih},")
            prolog.append(f"    .data_size = {iw * ih * 4},")
            prolog.append(f"    .data = img_{key}_data,")
            prolog.append("};")
        prolog.append("")

    # prolog 插在 include 之后
    lines = g.lines
    insert_at = 0
    for i, l in enumerate(lines):
        if l.startswith("#include"):
            insert_at = i + 1
    body = "\n".join(lines[:insert_at]) + "\n\n" + "\n".join(prolog) + "\n" + "\n".join(lines[insert_at:])

    # screens 注册 + ui_init（无手势导航表，SPJ 事件未迁移，换页留空实现）
    pids = ["".join(c if c.isalnum() else "_" for c in str(pg["name"])).lower() for pg in pages]
    body += "\nstatic lv_obj_t *screens[] = {\n"
    body += "".join(f"    NULL, /* {p} */\n" for p in pids)
    body += "};\n\n"
    body += "void create_screens(void)\n{\n"
    for p in pids:
        body += f"    screens[{len([1]) * 0 + pids.index(p)}] = create_screen_{p}();\n"
    body += "}\n\n"
    body += "void gesture_cb(lv_event_t *e)\n{\n"
    body += "    lv_dir_t dir = lv_indev_get_gesture_dir(lv_indev_active());\n"
    body += "    int current = -1;\n"
    body += "    for (size_t i = 0; i < sizeof(screens)/sizeof(screens[0]); i++)\n"
    body += "        if (screens[i] == lv_event_get_current_target(e)) current = (int)i;\n"
    body += "    if (current < 0) return;\n"
    body += "    int count = (int)(sizeof(screens)/sizeof(screens[0]));\n"
    body += "    if (dir == LV_DIR_LEFT)  /* 左滑 → 下一屏 */\n"
    body += "        lv_screen_load_anim(screens[(current + 1) % count], LV_SCR_LOAD_ANIM_MOVE_LEFT, 250, 0, false);\n"
    body += "    else if (dir == LV_DIR_RIGHT)  /* 右滑 → 上一屏 */\n"
    body += "        lv_screen_load_anim(screens[(current + count - 1) % count], LV_SCR_LOAD_ANIM_MOVE_RIGHT, 250, 0, false);\n"
    body += "}\n\n"
    body += "void ui_init(void)\n{\n    create_screens();\n    lv_screen_load(screens[0]);\n}\n\n"
    body += "void ui_show_page(int idx)\n{\n"
    body += "    int count = (int)(sizeof(screens)/sizeof(screens[0]));\n"
    body += "    if (idx >= 0 && idx < count) lv_screen_load(screens[idx]);\n"
    body += "}\n"
    open(os.path.join(outdir, "ui.c"), "w", encoding="utf-8").write(body)

    decls = "\n".join(f"lv_obj_t *create_screen_{p}(void);" for p in pids)
    uh = f"""#ifndef UI_H
#define UI_H

#include <lvgl/lvgl.h>

#define UI_SCREEN_WIDTH {project["width"]}
#define UI_SCREEN_HEIGHT {project["height"]}

{decls}
void create_screens(void);
void gesture_cb(lv_event_t *e);
void ui_init(void);
void ui_show_page(int idx);

#endif
"""
    open(os.path.join(outdir, "ui.h"), "w", encoding="utf-8").write(uh)
    return pids


if __name__ == "__main__":
    proj = json.load(open(sys.argv[1], encoding="utf-8"))
    outdir = sys.argv[2] if len(sys.argv) > 2 else "spj-ui"
    assets_root = sys.argv[3] if len(sys.argv) > 3 else os.path.dirname(os.path.abspath(sys.argv[1]))
    pages = generate(proj, outdir, assets_root)
    print(f"生成完成 → {outdir}/  页面: {', '.join(pages)}")
