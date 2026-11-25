# Antigravity Desktop 简体中文补丁 - 移除当前用户计划任务
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$TaskName = 'AntigravityZhCnReapply'
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) {
    Write-Host "计划任务 $TaskName 不存在，无需移除。"
    exit 0
}
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "已移除计划任务：$TaskName"
