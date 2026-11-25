# Antigravity Desktop zh-CN patch - register a current-user scheduled task.
# No administrator required. Does not modify the Antigravity install directory
# and does not disable official updates.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Watch = Join-Path $Root 'watch.ps1'
$TaskName = 'AntigravityZhCnReapply'
$IntervalMinutes = 15

if (-not (Test-Path -LiteralPath $Watch)) {
    throw 'watch.ps1 not found'
}

# A logon trigger often requires elevation on current Windows builds.
# schtasks /SC MINUTE creates an indefinite 15-minute trigger in the
# current user's task folder, which does not need administrator rights.
$tr = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $Watch + '"'
$out = & schtasks.exe /Create /TN $TaskName /TR $tr /SC MINUTE /MO $IntervalMinutes /F /RL LIMITED 2>&1
if ($LASTEXITCODE -ne 0) {
    throw ('Register-ScheduledTask failed: ' + ($out | Out-String).Trim())
}

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
if ($task.State -eq 'Disabled') {
    throw "Scheduled task $TaskName was created but is disabled."
}

Write-Host "Registered current-user scheduled task: $TaskName"
Write-Host "It checks the install layout and patch markers about every $IntervalMinutes minutes."
Write-Host "If an official update wipes the patch, it waits for Antigravity to exit, then re-applies. It never kills processes."
Write-Host "Log: %LOCALAPPDATA%\antigravity-zh-cn\watch.log"
Write-Host ""
Write-Host "Disable (keep task definition): Disable-ScheduledTask -TaskName $TaskName"
Write-Host "Remove:                        .\uninstall-watch.ps1"
Write-Host "Manual read-only detect:       .\watch.ps1 -Detect"
