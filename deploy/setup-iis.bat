@echo off
chcp 65001 >nul
echo ========================================
echo   兴野智汇远程图像采集管理平台
echo   IIS 反向代理配置（域名绑定）
echo ========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [错误] 请以管理员身份运行此脚本！
    pause
    exit /b 1
)

:: 参数设置
set SITE_NAME=XingYeImagePlatform
set DOMAIN=%1
set PORT=3000

if "%DOMAIN%"=="" (
    set /p DOMAIN="请输入您的域名（如 image.example.com）: "
)

if "%DOMAIN%"=="" (
    echo [错误] 域名不能为空
    pause
    exit /b 1
)

echo.
echo 将为域名 %DOMAIN% 配置 IIS 反向代理到 localhost:%PORT%
echo.

:: 检查 IIS 是否安装
dism /online /get-features /format:table | findstr "IIS-WebServerRole" >nul 2>&1
if %errorLevel% neq 0 (
    echo [1/4] 正在安装 IIS...
    dism /online /enable-feature /featurename:IIS-WebServerRole /all /quiet
    dism /online /enable-feature /featurename:IIS-ApplicationRequestRouting /all /quiet 2>nul
    dism /online /enable-feature /featurename:IIS-HttpRedirect /all /quiet 2>nul
    echo [√] IIS 安装完成
) else (
    echo [√] IIS 已安装
)

:: 检查 URL Rewrite 模块
if not exist "%SystemRoot%\System32\inetsrv\rewrite.dll" (
    echo.
    echo [警告] 未检测到 URL Rewrite 模块
    echo 请手动下载安装: https://www.iis.net/downloads/microsoft/url-rewrite
    echo.
    echo 安装后重新运行此脚本。
    pause
    exit /b 1
)

:: 检查 ARR (Application Request Routing)
if not exist "%SystemRoot%\System32\inetsrv\arr.dll" (
    echo.
    echo [警告] 未检测到 Application Request Routing 模块
    echo 请手动下载安装: https://www.iis.net/downloads/microsoft/application-request-routing
    echo.
    echo 安装后重新运行此脚本。
    pause
    exit /b 1
)

echo.
echo [2/4] 配置 IIS 反向代理...

:: 启用代理
%SystemRoot%\System32\inetsrv\appcmd.exe set config -section:system.webServer/proxy /enabled:"True" /commit:apphost >nul 2>&1

:: 创建 IIS 站点
%SystemRoot%\System32\inetsrv\appcmd.exe delete site "%SITE_NAME%" >nul 2>&1
%SystemRoot%\System32\inetsrv\appcmd.exe add site /name:"%SITE_NAME%" /bindings:"http://%DOMAIN%:80" /physicalPath:"%~dp0.."

echo [√] IIS 站点已创建

echo.
echo [3/4] 创建 web.config 反向代理规则...

:: 创建 web.config
set WEB_CONFIG=%~dp0..\web.config
(
echo ^<?xml version="1.0" encoding="UTF-8"?^>
echo ^<configuration^>
echo   ^<system.webServer^>
echo     ^<rewrite^>
echo       ^<rules^>
echo         ^<rule name="ReverseProxyToNode" stopProcessing="true"^>
echo           ^<match url=".*" /^>
echo           ^<action type="Rewrite" url="http://localhost:%PORT%/{R:0}" /^>
echo         ^</rule^>
echo       ^</rules^>
echo     ^</rewrite^>
echo   ^</system.webServer^>
echo ^</configuration^>
) > "%WEB_CONFIG%"

echo [√] web.config 已创建: %WEB_CONFIG%

echo.
echo [4/4] 启动 IIS 站点...
%SystemRoot%\System32\inetsrv\appcmd.exe start site "%SITE_NAME%"
%SystemRoot%\System32\inetsrv\appcmd.exe start apppool /apppool.name:"%SITE_NAME%"

echo.
echo ========================================
echo   IIS 反向代理配置完成！
echo.
echo   域名: http://%DOMAIN%
echo   代理到: http://localhost:%PORT%
echo.
echo   注意:
echo   1. 请在阿里云安全组中开放 80 端口
echo   2. 请在域名 DNS 中将 %DOMAIN% 解析到服务器IP
echo   3. 如需修改域名，重新运行此脚本
echo ========================================
pause
