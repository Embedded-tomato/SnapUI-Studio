"""启动器：显示加载窗口，并无控制台地启动 SPJ 转换器

用法:
  python converter/launcher.py        (开发调试，有控制台)
  pythonw converter/launcher.py       (正式使用，无控制台)

行为:
  1. 显示深色加载窗口
  2. 用 pythonw 启动 converter/app.py（子进程，错误写入 build-tmp/launcher.log）
  3. 轮询主窗口标题出现 → 关闭加载窗口并退出
"""
import ctypes
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "converter", "app.py")
LOG_DIR = os.path.join(ROOT, "build-tmp")
LOG_FILE = os.path.join(LOG_DIR, "launcher.log")
WINDOW_TITLE = "SnapUI Studio"
ICON_FILE = os.path.join(ROOT, "converter", "assets", "icon.ico")
TIMEOUT = 60


def find_main_window():
    """按标题精确查找已打开的主窗口，返回 hwnd 或 None"""
    found = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    def cb(hwnd, _lparam):
        buf = ctypes.create_unicode_buffer(256)
        ctypes.windll.user32.GetWindowTextW(hwnd, buf, 256)
        if buf.value == WINDOW_TITLE:
            found.append(hwnd)
        return True

    ctypes.windll.user32.EnumWindows(cb, None)
    return found[0] if found else None


def apply_icon(hwnd):
    """给主窗口设置任务栏/标题栏图标（WM_SETICON）"""
    if not hwnd or not os.path.exists(ICON_FILE):
        return
    try:
        user32 = ctypes.windll.user32
        LR_LOADFROMFILE, LR_DEFAULTSIZE = 0x10, 0x40
        hicon = user32.LoadImageW(None, ICON_FILE, 1, 0, 0, LR_LOADFROMFILE | LR_DEFAULTSIZE)
        if hicon:
            user32.SendMessageW(hwnd, 0x80, 0, hicon)  # WM_SETICON, ICON_SMALL
            user32.SendMessageW(hwnd, 0x80, 1, hicon)  # WM_SETICON, ICON_BIG
    except Exception:
        pass


def log_tail():
    try:
        with open(LOG_FILE, encoding="utf-8", errors="replace") as f:
            return f.read()[-600:]
    except OSError:
        return "(无日志)"


def show_splash(message, color="#e5e7eb"):
    """创建无框加载窗口，返回 (root, label)"""
    import tkinter as tk

    root = tk.Tk()
    root.overrideredirect(True)
    w, h = 420, 180
    sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
    root.geometry(f"{w}x{h}+{(sw - w) // 2}+{(sh - h) // 2}")
    root.configure(bg="#111827")

    tk.Label(root, text="SnapUI Studio", font=("Segoe UI", 18, "bold"),
             bg="#111827", fg="#ffffff").place(relx=0.5, y=52, anchor="center")
    lbl = tk.Label(root, text=message, font=("Segoe UI", 10),
                   bg="#111827", fg=color)
    lbl.place(relx=0.5, y=105, anchor="center")
    tk.Label(root, text="SPJ converter", font=("Segoe UI", 8),
             bg="#111827", fg="#6b7280").place(relx=0.5, y=145, anchor="center")
    root.update()
    return root, lbl


def main():
    os.makedirs(LOG_DIR, exist_ok=True)
    pythonw = os.path.join(os.path.dirname(sys.executable), "pythonw.exe")
    py = pythonw if os.path.exists(pythonw) else sys.executable
    log = open(LOG_FILE, "w", encoding="utf-8")
    proc = subprocess.Popen([py, APP], cwd=ROOT, stdout=log, stderr=log)

    root, lbl = show_splash("Loading SPJ converter ...")
    t0 = time.time()
    dots = 0
    try:
        while time.time() - t0 < TIMEOUT:
            root.update()
            hwnd = find_main_window()
            if hwnd:
                apply_icon(hwnd)
                return 0
            if proc.poll() is not None:
                lbl.config(text="启动失败，详见 build-tmp/launcher.log\n" + log_tail(),
                           fg="#f87171")
                root.update()
                time.sleep(10)
                return 1
            dots = (dots + 1) % 4
            lbl.config(text="Loading SPJ converter " + "." * dots)
            time.sleep(0.3)
        lbl.config(text="加载超时，请查看 build-tmp/launcher.log", fg="#f87171")
        root.update()
        time.sleep(10)
        return 1
    finally:
        try:
            root.destroy()
        except Exception:
            pass
        log.close()


if __name__ == "__main__":
    sys.exit(main())
