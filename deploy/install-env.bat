@echo off
chcp 65001 >nul
echo ========================================
echo   兴野智汇远程图像采集管理平台 - 部署脚本
echo   环境安装 (Node.js + NSSM)
echo ========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [错误] 请以管理员身份运行此脚本！
    pause
    exit /b 1
)

:: 检查 Node.js 是否已安装
where node >nul 2>&1
if %errorLevel% equ 0 (
    echo [√] Node.js 已安装:
    node --version
    goto :check_nssm
)

echo [1/3] 正在下载 Node.js LTS...
set NODE_URL=https://npmmirror.com/mirrors/node/v20.18.0/node-v20.18.0-x64.msi
set NODE_INSTALLER=%TEMP%\node-install.msi

powershell -Command "Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_INSTALLER%'"
if %errorLevel% neq 0 (
    echo [错误] 下载 Node.js 失败，请手动安装: https://npmmirror.com/mirrors/node/
    pause
    exit /b 1
)

echo [2/3] 正在安装 Node.js...
msiexec /i "%NODE_INSTALLER%" /qn
if %errorLevel% neq 0 (
    echo [错误] 安装 Node.js 失败
    pause
    exit /b 1
)

:: 刷新环境变量
set "PATH=%PATH%;C:\Program Files\nodejs\"
echo [√] Node.js 安装完成:
node --version

:check_nssm
echo.

:: 检查 NSSM 是否已存在
where nssm >nul 2>&1
if %errorLevel% equ 0 (
    echo [√] NSSM 已安装
    goto :done
)

echo [3/3] 正在下载 NSSM...
set NSSM_URL=https://nssm.cc/release/nssm-2.24.zip
set NSSM_ZIP=%TEMP%\nssm.zip
set NSSM_DIR=C:\nssm

powershell -Command "Invoke-WebRequest -Uri '%NSSM_URL%' -OutFile '%NSSM_ZIP%'"
if %errorLevel% neq 0 (
    echo [警告] 下载 NSSM 失败，请手动下载: https://nssm.cc/release/nssm-2.24.zip
    echo        解压后将 nssm.exe 放到 C:\nssm\ 目录下
    goto :done
)

echo 正在解压 NSSM...
powershell -Command "Expand-Archive -Path '%NSSM_ZIP%' -DestinationPath '%TEMP%\nssm-extract' -Force"
if not exist "%NSSM_DIR%" mkdir "%NSSM_DIR%"
copy "%TEMP%\nssm-extract\nssm-2.24\win64\nssm.exe" "%NSSM_DIR%\nssm.exe" >nul

:: 添加到系统 PATH
setx PATH "%PATH%;%NSSM_DIR%" /M >nul 2>&1
set "PATH=%PATH%;%NSSM_DIR%"

echo [√] NSSM 安装完成: %NSSM_DIR%\nssm.exe

:done
echo.
echo ========================================
echo   环境安装完成！
echo   请继续运行 install-service.bat 注册服务
echo ========================================
pause
