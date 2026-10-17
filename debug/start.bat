@echo off
cd /d %~dp0..

echo ============================================
echo   SnapUI Studio
echo ============================================
echo.
echo   [1] SPJ converter (desktop app, main)
echo   [2] Camera UI editor (browser + local build server)
echo.
set /p choice=Choose (1/2, default 1):
if "%choice%"=="" set choice=1

if "%choice%"=="2" goto editor

REM ---------- converter ----------
python -c "import webview, ziglang, PIL, numpy" 2>nul
if errorlevel 1 (
    echo.
    echo [info] Python dependencies missing, installing pywebview ziglang pillow numpy ...
    python -m pip install pywebview ziglang pillow numpy
    if errorlevel 1 (
        echo [error] pip install failed, check your Python environment
        pause
        exit /b 1
    )
)
echo.
echo Starting SPJ converter (splash will show, this window closes) ...
start "" pythonw converter\launcher.py
goto end

REM ---------- editor ----------
:editor
where npm >nul 2>nul
if errorlevel 1 (
    echo [error] npm not found, please install Node.js first
    pause
    exit /b 1
)
if not exist editor\node_modules (
    echo.
    echo [info] First run, installing frontend dependencies (1-2 min)...
    pushd editor
    call npm install
    popd
    if errorlevel 1 (
        echo [error] npm install failed
        pause
        exit /b 1
    )
)
echo.
echo Starting local build server (port 7600) ...
start "SnapUI Build Server" python tools\server.py
timeout /t 2 /nobreak >nul
echo Starting editor ...
pushd editor
call npm run dev
popd

:end
