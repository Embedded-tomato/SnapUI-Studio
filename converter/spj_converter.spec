# PyInstaller 打包配置：SPJ 工程转换器
import os
from PyInstaller.utils.hooks import collect_all

ROOT = os.path.abspath(os.getcwd())
ZIG = os.path.join(os.environ["LOCALAPPDATA"], "..", "..", "Roaming")  # placeholder
import ziglang
ZIG_DIR = os.path.dirname(ziglang.__file__)

datas = [
    (os.path.join(ROOT, "converter", "ui"), "converter/ui"),
    (os.path.join(ROOT, "converter", "sim_main.c"), "converter"),
    (os.path.join(ROOT, "converter", "assets", "icon.ico"), "converter/assets"),
    (os.path.join(ROOT, "tools", "gen_spj_c.py"), "tools"),
    (os.path.join(ROOT, "wasm", "shim.c"), "wasm"),
    (os.path.join(ROOT, "wasm", "conf", "lv_conf.h"), "wasm/conf"),
    (os.path.join(ROOT, "lv_conf.h"), "."),
    (os.path.join(ROOT, "lvgl", "lvgl.h"), "lvgl"),
    (os.path.join(ROOT, "lvgl", "src"), "lvgl/src"),
    (os.path.join(ROOT, "sdl2", "SDL2-2.32.10", "x86_64-w64-mingw32", "include"), "sdl2/SDL2-2.32.10/x86_64-w64-mingw32/include"),
    (os.path.join(ROOT, "sdl2", "SDL2-2.32.10", "x86_64-w64-mingw32", "lib"), "sdl2/SDL2-2.32.10/x86_64-w64-mingw32/lib"),
    (os.path.join(ROOT, "sdl2", "SDL2-2.32.10", "x86_64-w64-mingw32", "bin"), "sdl2/SDL2-2.32.10/x86_64-w64-mingw32/bin"),
    (os.path.join(ZIG_DIR, "zig.exe"), "ziglang"),
    (os.path.join(ZIG_DIR, "lib"), "ziglang/lib"),
]

wv_datas, wv_binaries, wv_hidden = collect_all("webview")
datas += wv_datas
binaries = wv_binaries
hiddenimports = wv_hidden + ["clr", "pythonnet"]

a = Analysis(
    [os.path.join(ROOT, "converter", "app.py")],
    pathex=[ROOT],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="SPJ工程转换器",
    debug=False,
    strip=False,
    upx=False,
    console=False,
    icon=os.path.join(ROOT, "converter", "assets", "icon.ico"),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="SPJ工程转换器",
)
