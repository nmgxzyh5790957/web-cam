@echo off
chcp 65001 >nul
echo ========================================
echo   兴野智汇远程图像采集管理平台
echo   更新部署（重新构建前端 + 重启服务）
echo ========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [错误] 请以管理员身份运行此脚本！
    pause
    exit /b 1
)

set APP_NAME=XingYeImagePlatform
set APP_DIR=%~dp0..
set NSSM=C:\nssm\nssm.exe

echo [1/3] 重新构建前端...
cd /d "%APP_DIR%"
call npm run build
if %errorLevel% neq 0 (
    echo [错误] 构建前端失败
    pause
    exit /b 1
)
echo [√] 前端构建完成

echo.
echo [2/3] 重启服务...
%NSSM% restart %APP_NAME%
timeout /t 3 /nobreak >nul
echo [√] 服务已重启

echo.
echo [3/3] 检查服务状态...
%NSSM% status %APP_NAME%

echo.
echo ========================================
echo   更新完成！
echo   访问地址: http://localhost:3000
echo ========================================
pause
