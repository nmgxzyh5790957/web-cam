@echo off
chcp 65001 >nul
echo ========================================
echo   兴野智汇远程图像采集管理平台
echo   安装 Windows 服务
echo ========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [错误] 请以管理员身份运行此脚本！
    pause
    exit /b 1
)

:: 设置变量 - 请根据实际情况修改
set APP_NAME=XingYeImagePlatform
set APP_DIR=%~dp0..
set APP_ENTRY=%APP_DIR%\server\server.js
set NSSM=C:\nssm\nssm.exe

:: 检查 NSSM
if not exist "%NSSM%" (
    echo [错误] 未找到 NSSM，请先运行 install-env.bat
    pause
    exit /b 1
)

:: 检查项目文件
if not exist "%APP_ENTRY%" (
    echo [错误] 未找到入口文件: %APP_ENTRY%
    echo 请确保将整个项目目录上传到服务器
    pause
    exit /b 1
)

:: 检查 node
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [错误] 未找到 Node.js，请先运行 install-env.bat
    pause
    exit /b 1
)

echo [1/4] 安装项目依赖...
cd /d "%APP_DIR%"
call npm install --production
if %errorLevel% neq 0 (
    echo [错误] 安装依赖失败
    pause
    exit /b 1
)
echo [√] 依赖安装完成

echo.
echo [2/4] 停止旧服务（如存在）...
%NSSM% stop %APP_NAME% >nul 2>&1
%NSSM% remove %APP_NAME% confirm >nul 2>&1
echo [√] 旧服务已清理

echo.
echo [3/4] 注册 Windows 服务...
for /f "delims=" %%i in ('where node') do set NODE_PATH=%%i
%NSSM% install %APP_NAME% "%NODE_PATH%" "--no-warnings" "%APP_ENTRY%"
%NSSM% set %APP_NAME% AppDirectory "%APP_DIR%"
%NSSM% set %APP_NAME% AppEnvironmentExtra NODE_ENV=production
%NSSM% set %APP_NAME% AppStdout "%APP_DIR%\logs\stdout.log"
%NSSM% set %APP_NAME% AppStderr "%APP_DIR%\logs\stderr.log"
%NSSM% set %APP_NAME% AppRotateFiles 1
%NSSM% set %APP_NAME% AppRotateOnline 1
%NSSM% set %APP_NAME% AppRotateBytes 10485760

:: 创建日志目录
if not exist "%APP_DIR%\logs" mkdir "%APP_DIR%\logs"

echo [√] 服务已注册: %APP_NAME%

echo.
echo [4/4] 启动服务...
%NSSM% start %APP_NAME%
timeout /t 3 /nobreak >nul

:: 检查服务状态
%NSSM% status %APP_NAME%
if %errorLevel% equ 0 (
    echo.
    echo ========================================
    echo   部署成功！
    echo   服务名称: %APP_NAME%
    echo   访问地址: http://localhost:3000
    echo   API检查:   http://localhost:3000/api/health
    echo ========================================
    echo.
    echo 常用命令:
    echo   启动: nssm start %APP_NAME%
    echo   停止: nssm stop %APP_NAME%
    echo   重启: nssm restart %APP_NAME%
    echo   状态: nssm status %APP_NAME%
    echo   卸载: nssm remove %APP_NAME% confirm
) else (
    echo.
    echo [警告] 服务可能未正常启动，请检查日志:
    echo   %APP_DIR%\logs\stderr.log
)

echo.
pause
