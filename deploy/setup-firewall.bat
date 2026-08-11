@echo off
chcp 65001 >nul

:: 阿里云安全组端口开放提醒脚本
echo ========================================
echo   阿里云安全组端口配置提醒
echo ========================================
echo.
echo 请在阿里云控制台开放以下端口:
echo.
echo   [必须] 80    - HTTP 网站访问
echo   [必须] 3000  - Node.js 后端服务（如不使用 IIS）
echo   [可选] 21    - FTP 服务（如需外部访问FTP）
echo   [可选] 3389  - 远程桌面（通常默认已开）
echo.
echo 操作步骤:
echo   1. 登录阿里云控制台 https://ecs.console.aliyun.com
echo   2. 找到您的 ECS 实例
echo   3. 点击实例名称进入详情
echo   4. 选择「安全组」标签页
echo   5. 点击「配置规则」^>「手动添加」
echo   6. 添加入方向规则:
echo      - 端口范围: 80/80
echo      - 授权对象: 0.0.0.0/0
echo      - 协议类型: TCP
echo.
echo ========================================
pause
