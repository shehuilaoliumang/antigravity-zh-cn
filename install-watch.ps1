# Antigravity Desktop 简体中文补丁 - 注册当前用户计划任务
# 无需管理员。不会改动 Antigravity 安装目录，也不会关闭官方更新。
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Watch = Join-Path $Root 'watch.ps1'
$TaskName = 'AntigravityZhCnReapply'
$IntervalMinutes = 15

if (-not (Test-Path -LiteralPath $Watch)) {
    throw "未找到 watch.ps1：$Watch"
}

$arg = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Watch`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg -WorkingDirectory $Root

$interval = New-TimeSpan -Minutes $IntervalMinutes
$duration = New-TimeSpan -Days 3650
$start = (Get-Date).AddMinutes(1)
$repeat = New-ScheduledTaskTrigger -Once -At $start -RepetitionInterval $interval -RepetitionDuration $duration
$logon = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 8) `
    -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName `
    -Action $action `
    -Trigger @($logon, $repeat) `
    -Settings $settings `
    -Principal $principal `
    -Description 'Detect a wiped Antigravity zh-CN patch after an official update and re-apply it only after Antigravity has exited. Never kills the app and never disables official updates.' `
    -Force | Out-Null

Write-Host "已注册当前用户计划任务：$TaskName"
Write-Host "将在登录时以及大约每 $IntervalMinutes 分钟检查一次。"
Write-Host "若检测到补丁被官方更新覆盖，会等待 Antigravity 自行退出后再重打，不会结束进程。"
Write-Host "日志：%LOCALAPPDATA%\antigravity-zh-cn\watch.log"
Write-Host ""
Write-Host "停用（保留任务定义）：Disable-ScheduledTask -TaskName $TaskName"
Write-Host "移除：               .\uninstall-watch.ps1"
Write-Host "手动只读检测：       .\watch.ps1 -Detect"
