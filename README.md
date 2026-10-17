# SnapUI Studio

> SquareLine 工程迁移 + 真 LVGL 内核实时仿真 + 可编译 C 代码导出 —— 相机嵌入式 UI 工具链

SnapUI Studio 是一套面向嵌入式相机产品的 UI 工具链：把存量 SquareLine Studio 工程（.spj）无损迁移过来，在真 LVGL 内核上实时仿真，并导出经过编译验证的 LVGL C 代码。

## 为什么做这个

- SquareLine 工程文件（.spj）是私有格式，没有任何编辑器能导入——本工具完整解析了它的结构
- 市面上的仿真器都是"模仿" LVGL 渲染，永远有偏差——本工具把 **LVGL 9.5 内核编译成 WASM**，仿真跑的就是固件同款代码
- 导出的代码经过 zig cc 对照 LVGL 源码编译验证，不是摆设

## 功能

| 模块 | 说明 |
|---|---|
| `converter/` | Windows 桌面软件（Python + WebView2）：导入 .spj → 高保真预览 → 一键 WASM 实时仿真 → 导出中间 JSON / LVGL C 工程 |
| `tools/` | 命令行工具链：`.spj` 解析器、中间 JSON → LVGL C 代码生成器、构建仿真服务 |
| `wasm/` | LVGL WASM 桥接层（帧缓冲 + 鼠标 + 手势），zig 编译 |
| `editor/` | 相机专用 UI 编辑器原型（React，槽位吸附 + 预制组件） |

## 快速开始

```bash
# 运行桌面转换器（需要 Python 3.12+，pywebview）
pip install pywebview ziglang pillow numpy
python converter/app.py

# 打包成 exe（全内置环境）
pyinstaller converter/spj_converter.spec
```

## 测试工程

本仓库不含第三方工程文件，测试请用：

- [esp32-tft-squareline](https://github.com/al-serebrov/esp32-tft-squareline)（4 屏时钟工程，含 assets）
- [lvgl_hello_world](https://github.com/jpowen898/lvgl_hello_world)（圆形表盘）

## 技术要点

- **.spj 协议**：纯 JSON，组件树 + `nid/strtype/strval/intarray` 属性结构；`size:[1,1]` = LV_SIZE_CONTENT 语义（先量内容再锚定）
- **手势**：LVGL 9.5 需 `LV_USE_GESTURE_RECOGNITION=1` + `LV_USE_FLOAT=1`，屏幕需移除 `GESTURE_BUBBLE`
- **图片**：PNG 直接转 ARGB8888 位图内嵌（含正确头部尺寸），避免 RAW 解码路径的各种坑
- **打包**：PyInstaller onedir + 内置 zig 编译器 + LVGL 源码 + SDL2，466MB 全内置

## License

MIT
