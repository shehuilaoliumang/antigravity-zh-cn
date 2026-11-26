# Antigravity Desktop zh-CN patch - remove the current-user scheduled task
# and stop the hidden watcher daemon.
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$TaskName = 'AntigravityZhCnReapply'
$Vbs = Join-Path $Root 'watch-hidden.vbs'
$Wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    try { Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue } catch { }
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "已移除计划任务：$TaskName"
} else {
    Write-Host "计划任务 $TaskName 不存在，无需移除。"
}

if ((Test-Path -LiteralPath $Vbs) -and (Test-Path -LiteralPath $Wscript)) {
    try {
        $p = Start-Process -FilePath $Wscript -ArgumentList @('//nologo','//B',"`"$Vbs`"","--stop") -WindowStyle Hidden -PassThru -Wait
        if ($p.ExitCode -eq 0) {
            Write-Host "已请求守护进程退出。"
        }
    } catch {
        Write-Host ("未能发送停止请求：" + $_.Exception.Message)
    }
}
