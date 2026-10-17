"""相机 UI 编辑器本地后端：代码生成 + 编译 + 仿真运行
用法: python server.py  (默认端口 7600)
API:
  POST /api/build  {project: <UiProject JSON>}  → 生成 C 代码并编译 camera-sim.exe
  POST /api/run    {}                            → 启动模拟器（自动杀掉旧实例）
  GET  /api/health                               → {"ok": true}
"""
import json
import os
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
SIM_EXE = os.path.join(ROOT, "camera-sim.exe")

ZIG = [sys.executable, "-m", "ziglang", "cc"]


def build_project(project: dict) -> str:
    """JSON → C → exe，返回构建日志"""
    log = []
    json_path = os.path.join(ROOT, "_current_project.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(project, f, ensure_ascii=False, indent=2)
    log.append(f"[1/3] 工程已保存 ({len(project.get('pages', {}))} 个页面)")

    r = subprocess.run(
        [sys.executable, os.path.join(ROOT, "gen_lvgl.py"), json_path, os.path.join(ROOT, "firmware-ui")],
        capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=ROOT,
    )
    log.append("[2/3] 代码生成: " + (r.stdout.strip() or r.stderr.strip()))
    if r.returncode != 0:
        raise RuntimeError("代码生成失败\n" + r.stderr)

    t0 = time.time()
    r = subprocess.run(
        ZIG + ["@build.rsp"], capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=ROOT,
    )
    if r.returncode != 0:
        raise RuntimeError("编译失败\n" + (r.stderr or r.stdout)[-2000:])
    log.append(f"[3/3] 编译完成 ({time.time() - t0:.1f}s) → camera-sim.exe")
    return "\n".join(log)


def run_sim() -> str:
    # 杀掉旧实例
    subprocess.run(["taskkill", "/F", "/IM", "camera-sim.exe"], capture_output=True)
    subprocess.Popen([SIM_EXE], cwd=ROOT)
    return "模拟器已启动"


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(200, {"ok": True})

    def do_GET(self):
        if self.path == "/api/health":
            self._send(200, {"ok": True})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
            if self.path == "/api/build":
                self._send(200, {"ok": True, "log": build_project(body["project"])})
            elif self.path == "/api/run":
                self._send(200, {"ok": True, "log": run_sim()})
            else:
                self._send(404, {"error": "not found"})
        except Exception as e:
            import traceback
            traceback.print_exc()
            self._send(500, {"ok": False, "error": str(e), "trace": traceback.format_exc()[-1500:]})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 7600
    print(f"相机 UI 构建仿真服务已启动: http://localhost:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
