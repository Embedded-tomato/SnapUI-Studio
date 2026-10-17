"""SPJ 工程转换器 — Windows 桌面软件（支持源码运行和 PyInstaller 打包）
开发: python converter/app.py
打包: pyinstaller converter/spj_converter.spec
"""
import json
import os
import subprocess
import sys

import webview


def resource_path(*parts):
    """兼容开发模式和 PyInstaller 打包模式的资源路径"""
    base = getattr(sys, "_MEIPASS", None)
    if base:
        return os.path.join(base, *parts)
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), *parts)


ROOT = resource_path()                     # lvgl/、ziglang/ 所在根
OUT_DIR = os.path.join(os.path.expanduser("~"), "Documents", "SPJ-Export")
os.makedirs(OUT_DIR, exist_ok=True)


def zig_cmd():
    """返回 zig 编译器命令"""
    exe = resource_path("ziglang", "zig.exe")
    if os.path.exists(exe):
        return [exe, "cc"]
    return [sys.executable, "-m", "ziglang", "cc"]


def gen_c(project_json_path, outdir, assets_root):
    """进程内调用代码生成器（打包后也能用）"""
    import importlib.util
    spec = importlib.util.spec_from_file_location("gen_spj_c", resource_path("gen_spj_c.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.generate(json.load(open(project_json_path, encoding="utf-8")), outdir, assets_root)


class Api:
    def __init__(self):
        self.spj_dir = ROOT

    def pick_spj(self):
        win = webview.windows[0]
        result = win.create_file_dialog(webview.OPEN_DIALOG, file_types=("SquareLine 工程 (*.spj)",))
        if not result:
            return None
        path = result[0] if isinstance(result, (list, tuple)) else result
        self.spj_dir = os.path.dirname(os.path.abspath(path))
        with open(path, encoding="utf-8", errors="replace") as f:
            return {"name": os.path.basename(path), "content": f.read()}

    def get_asset(self, rel_path):
        """自动多路径解析资源：工程目录直下、assets/ 子目录、按文件名全盘扫描"""
        rel = rel_path.replace("/", os.sep)
        candidates = [
            os.path.join(self.spj_dir, rel),
            os.path.join(self.spj_dir, "assets", os.path.basename(rel)),
        ]
        path = next((c for c in candidates if os.path.exists(c)), None)
        if not path:
            # 按文件名在工程目录递归找一次
            base = os.path.basename(rel)
            for root, _, files in os.walk(self.spj_dir):
                if base in files:
                    path = os.path.join(root, base)
                    break
        if not path or not os.path.exists(path):
            return None
        import base64
        ext = os.path.splitext(path)[1].lower().lstrip(".")
        mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
                "gif": "image/gif", "bmp": "image/bmp"}.get(ext, "application/octet-stream")
        with open(path, "rb") as f:
            return f"data:{mime};base64," + base64.b64encode(f.read()).decode()

    def save_text(self, filename, content):
        win = webview.windows[0]
        result = win.create_file_dialog(webview.SAVE_DIALOG, save_filename=filename)
        if not result:
            return None
        path = result if isinstance(result, str) else result[0]
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return path

    def _gen(self, project_json):
        os.makedirs(OUT_DIR, exist_ok=True)
        tmp = os.path.join(OUT_DIR, "_project.json")
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(project_json)
        return gen_c(tmp, OUT_DIR, self.spj_dir)

    def export_c(self, project_json):
        log = ["[1/3] 中间 JSON 已接收"]
        pages = self._gen(project_json)
        log.append(f"[2/3] C 代码生成完成（页面: {', '.join(pages)}）")

        r = subprocess.run(
            zig_cmd() + ["-c", "-I" + ROOT, "-target", "x86_64-linux-gnu",
                         "-o", os.path.join(OUT_DIR, "_check.o"), os.path.join(OUT_DIR, "ui.c")],
            capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=ROOT,
        )
        if r.returncode != 0:
            raise RuntimeError("编译验证失败:\n" + (r.stderr or "")[-800:])
        if os.path.exists(os.path.join(OUT_DIR, "_check.o")):
            os.remove(os.path.join(OUT_DIR, "_check.o"))
        log.append("[3/3] ✅ 编译验证通过（LVGL 9.5.0 API）")

        subprocess.Popen(["explorer", OUT_DIR])
        return {"log": "\n".join(log) + f"\n输出目录: {OUT_DIR}"}

    def simulate_wasm(self, project_json):
        """生成 C → 编译 WASM → 返回 base64，前端内嵌实时仿真"""
        import base64
        import glob
        self._gen(project_json)
        srcs = glob.glob(os.path.join(ROOT, "lvgl", "src", "**", "*.c"), recursive=True)
        srcs += [os.path.join(OUT_DIR, "ui.c"), resource_path("wasm", "shim.c")]
        flags = [
            "-target", "wasm32-wasi", "-Os", "-mexec-model=reactor",
            "-DLV_CONF_INCLUDE_SIMPLE",
            "-I" + resource_path("wasm", "conf"),
            "-I" + ROOT,
            "-I" + OUT_DIR,
            "-Wl,--no-entry", "-Wl,--export-memory",
            "-Wl,--initial-memory=67108864", "-Wl,--max-memory=134217728",
            "-o", os.path.join(OUT_DIR, "lvgl-sim.wasm"),
        ]
        rsp = os.path.join(OUT_DIR, "build-wasm.rsp")
        with open(rsp, "w") as f:
            f.write("\n".join(flags + srcs))
        r = subprocess.run(
            zig_cmd() + ["@" + rsp],
            capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=ROOT,
        )
        if r.returncode != 0:
            raise RuntimeError("WASM 编译失败:\n" + (r.stderr or "")[-800:])
        with open(os.path.join(OUT_DIR, "lvgl-sim.wasm"), "rb") as f:
            wasm_b64 = base64.b64encode(f.read()).decode()
        return {"wasm": wasm_b64}

    def simulate(self, project_json):
        self._gen(project_json)
        # 运行时生成编译清单（开发/打包模式通用）
        import glob
        srcs = glob.glob(os.path.join(ROOT, "lvgl", "src", "**", "*.c"), recursive=True)
        srcs += [os.path.join(OUT_DIR, "ui.c"), resource_path("converter", "sim_main.c")]
        flags = [
            "-target", "x86_64-windows-gnu", "-O1",
            "-I" + ROOT, "-I" + OUT_DIR,
            "-I" + resource_path("sdl2", "SDL2-2.32.10", "x86_64-w64-mingw32", "include"),
            "-o", os.path.join(OUT_DIR, "spj-sim.exe"),
            resource_path("sdl2", "SDL2-2.32.10", "x86_64-w64-mingw32", "lib", "libSDL2.dll.a"),
        ]
        rsp = os.path.join(OUT_DIR, "build-sim.rsp")
        with open(rsp, "w") as f:
            f.write("\n".join(flags + srcs))
        r = subprocess.run(
            zig_cmd() + ["@" + rsp],
            capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=ROOT,
        )
        if r.returncode != 0:
            raise RuntimeError("模拟器编译失败:\n" + (r.stderr or "")[-800:])
        exe = os.path.join(OUT_DIR, "spj-sim.exe")
        # SDL2.dll 放到模拟器旁边
        import shutil
        dll = resource_path("sdl2", "SDL2-2.32.10", "x86_64-w64-mingw32", "bin", "SDL2.dll")
        if os.path.exists(dll):
            shutil.copy(dll, OUT_DIR)
        subprocess.run(["taskkill", "/F", "/IM", "spj-sim.exe"], capture_output=True)
        subprocess.Popen([exe], cwd=OUT_DIR)
        return {"log": "✅ 模拟器已启动：鼠标点击 = 触摸，左滑/右滑切换屏幕"}


if __name__ == "__main__":
    html = resource_path("converter", "ui", "index.html")
    win = webview.create_window(
        "SPJ 工程转换器",
        url=html,
        js_api=Api(),
        width=1120,
        height=740,
        min_size=(900, 600),
        background_color="#f7f7f8",
    )
    webview.start(http_server=True)
