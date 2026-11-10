# ============================================================
# 速算练习 · 本地启动脚本
# 双击 start.bat 即可运行；本脚本也可单独执行
# ============================================================
$port = 8000
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# 取本机局域网 IPv4 地址
# 排除：回环、自动私有地址(169.254)、虚拟网卡（WSL/Hyper-V/VMware 等手机访问不到）
$ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
        $_.IPAddress -notlike '169.254.*' -and
        $_.IPAddress -ne '127.0.0.1' -and
        $_.PrefixOrigin -ne 'WellKnown' -and
        $_.InterfaceAlias -notmatch 'vEthernet|VMware|Virtual|Loopback|Hyper-V'
    } |
    Select-Object -ExpandProperty IPAddress

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  速算练习 已启动' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Cyan
if ($ips) {
    Write-Host ''
    foreach ($ip in $ips) {
        Write-Host "  手机浏览器打开：  http://${ip}:$port" -ForegroundColor Yellow
    }
    Write-Host ''
    Write-Host '  （手机需与本电脑连同一个 WiFi，多地址时任选一个试）' -ForegroundColor DarkGray
} else {
    Write-Host "  本机打开：        http://localhost:$port" -ForegroundColor Yellow
    Write-Host '  未检测到局域网 IP，请检查网络连接' -ForegroundColor Red
}
Write-Host ''
Write-Host '  首次打开后，请在浏览器菜单选择' -ForegroundColor DarkGray
Write-Host '  “添加到主屏幕”，之后即可离线使用' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  关闭本窗口即停止服务' -ForegroundColor DarkGray
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Set-Location $root
python -m http.server $port

