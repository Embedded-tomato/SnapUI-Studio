@echo off
chcp 65001 >nul
cd /d %~dp0

echo ============================================
echo   SnapUI Studio 一键启动
echo ============================================
echo.
echo   [1] SPJ 工程转换器（桌面软件，主程序）
echo   [2] 相机 UI 编辑器（浏览器 + 本地构建服务）
echo.
set /p choice=请选择 (1/2，默认 1):
if "%choice%"=="" set choice=1

if "%choice%"=="2" goto editor

REM ---------- 转换器 ----------
python -c "import webview, ziglang, PIL, numpy" 2>nul
if errorlevel 1 (
    echo.
    echo [提示] 缺少 Python 依赖，正在安装 pywebview ziglang pillow numpy ...
    python -m pip install pywebview ziglang pillow numpy
    if errorlevel 1 (
        echo [错误] 依赖安装失败，请检查 Python/pip 环境
        pause
        exit /b 1
    )
)
echo.
echo 正在启动 SPJ 工程转换器 ...
python converter\app.py
goto end

REM ---------- 编辑器 ----------
:editor
where npm >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 npm，请先安装 Node.js
    pause
    exit /b 1
)
if not exist editor\node_modules (
    echo.
    echo [提示] 首次运行，正在安装前端依赖（约 1-2 分钟）...
    pushd editor
    call npm install
    popd
    if errorlevel 1 (
        echo [错误] npm install 失败
        pause
        exit /b 1
    )
)
echo.
echo 正在启动本地构建服务 (port 7600) ...
start "SnapUI Build Server" python tools\server.py
timeout /t 2 /nobreak >nul
echo 正在启动编辑器 ...
pushd editor
call npm run dev
popd

:end
