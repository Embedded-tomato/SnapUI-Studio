"""SquareLine .spj 工程文件解析器（迁移器原型）
输入: .spj (纯 JSON)
输出: 干净的中间 JSON —— 页面列表 + 每页组件树（类型/名称/位置/尺寸/文本/关键属性）
"""
import json
import sys


def get_prop(node, strtype):
    for p in node.get("properties", []):
        if p.get("strtype") == strtype:
            return p
    return None


def prop_val(node, strtype, default=None):
    p = get_prop(node, strtype)
    if p is None:
        return default
    if "strval" in p:
        return p["strval"]
    if "intarray" in p:
        return p["intarray"]
    if "floatval" in p:
        return p["floatval"]
    if "flags" in p:
        return p["flags"]
    return default


def parse_style(node, strtype):
    """样式属性是嵌套 childs 结构，提取非继承（用户改过）的键值"""
    p = get_prop(node, strtype)
    if not p:
        return {}
    out = {}
    for c in p.get("childs", []):
        if "strval" in c:
            out[c["strtype"].split("/")[-1]] = c["strval"]
        elif "intarray" in c:
            out[c["strtype"].split("/")[-1]] = c["intarray"]
        elif "floatval" in c:
            out[c["strtype"].split("/")[-1]] = c["floatval"]
    return out


def parse_widget(node):
    objtype = node.get("saved_objtypeKey", "UNKNOWN")
    if objtype == "STARTEVENTS":
        return None
    w = {
        "type": objtype,
        "name": prop_val(node, "OBJECT/Name"),
        "position": prop_val(node, "OBJECT/Position"),
        "size": prop_val(node, "OBJECT/Size"),
        "align": prop_val(node, "OBJECT/Align"),
    }
    # 各类组件的专有属性
    if objtype == "LABEL":
        w["text"] = prop_val(node, "LABEL/Text")
    elif objtype == "BUTTON":
        w["text"] = prop_val(node, "BUTTON/Text")
    elif objtype == "ARC":
        w["range"] = prop_val(node, "ARC/Range")
        w["value"] = prop_val(node, "ARC/Value")
    elif objtype == "SLIDER":
        w["range"] = prop_val(node, "SLIDER/Range")
        w["value"] = prop_val(node, "SLIDER/Value")
    style = parse_style(node, f"{objtype}/Style_main")
    if style:
        w["style"] = style
    children = []
    for c in node.get("children", []):
        cw = parse_widget(c)
        if cw:
            children.append(cw)
    if children:
        w["children"] = children
    return w


def parse_spj(path):
    d = json.load(open(path, encoding="utf-8"))
    info = d.get("info", {})
    project = {
        "source": "squareline",
        "editor_version": info.get("editor_version"),
        "screen": {
            "width": info.get("width"),
            "height": info.get("height"),
            "shape": info.get("shape", "RECT"),
            "rotation": info.get("rotation", 0),
        },
        "pages": [],
    }
    for screen in d["root"].get("children", []):
        if not screen.get("isPage"):
            continue
        page = {
            "name": prop_val(screen, "SCREEN/Screen") or prop_val(screen, "OBJECT/Name"),
            "widgets": [],
        }
        for c in screen.get("children", []):
            w = parse_widget(c)
            if w:
                page["widgets"].append(w)
        project["pages"].append(page)
    return project


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "hello_world_app.spj"
    proj = parse_spj(src)
    out = src.rsplit(".", 1)[0] + ".parsed.json"
    json.dump(proj, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"编辑器版本: {proj['editor_version']}")
    print(f"屏幕: {proj['screen']['width']}x{proj['screen']['height']} {proj['screen']['shape']}")
    for pg in proj["pages"]:
        print(f"\n页面: {pg['name']}  ({len(pg['widgets'])} 个顶层组件)")

        def show(w, ind="  "):
            pos = w.get("position") or "?"
            size = w.get("size") or "?"
            extra = f' 文本="{w["text"]}"' if w.get("text") else ""
            print(f"{ind}[{w['type']}] {w.get('name')} pos={pos} size={size}{extra}")
            for c in w.get("children", []):
                show(c, ind + "  ")

        for w in pg["widgets"]:
            show(w)
    print(f"\n已输出中间 JSON: {out}")
