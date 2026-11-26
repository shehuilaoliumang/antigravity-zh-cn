# Antigravity Desktop zh-CN patch - register a current-user logon task.
# No administrator required. Does not modify the Antigravity install directory
# and does not disable official updates. The task starts a hidden watcher
# (wscript + node --daemon). There is no 15-minute poll.
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Vbs = Join-Path $Root 'watch-hidden.vbs'
$TaskName = 'AntigravityZhCnReapply'
$Wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'

if (-not (Test-Path -LiteralPath $Vbs)) {
    throw 'watch-hidden.vbs not found'
}
if (-not (Test-Path -LiteralPath $Wscript)) {
    throw 'wscript.exe not found'
}

# Remove any previous definition, including the old 15-minute poll task.
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$arg = '//nologo //B "' + $Vbs + '"'
$action = New-ScheduledTaskAction -Execute $Wscript -Argument $arg
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -MultipleInstances IgnoreNew
$settings.Hidden = $true
$settings.DisallowStartIfOnBatteries = $false
$settings.StopIfGoingOnBatteries = $false

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -User $userId -Force | Out-Null

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
if ($task.State -eq 'Disabled') {
    throw "Scheduled task $TaskName was created but is disabled."
}
$cmd = [string]$task.Actions.Execute
$taskArg = [string]$task.Actions.Arguments
if ($cmd -notlike '*wscript.exe' -or $taskArg -notlike '*watch-hidden.vbs*') {
    throw "Scheduled task did not record the hidden launcher: $cmd $taskArg"
}

# Start the hidden daemon now so a logoff is not required.
try {
    Start-ScheduledTask -TaskName $TaskName
} catch {
    throw ("Registered $TaskName but failed to start the watcher: " + $_.Exception.Message)
}

Write-Host "Registered current-user logon task: $TaskName"
Write-Host "It starts a hidden watcher that checks once at logon and then watches the install directory."
Write-Host "If an official update wipes the patch, it waits for Antigravity to exit, then re-applies. It never kills processes and does not write while the app is running."
Write-Host "Log: %LOCALAPPDATA%\antigravity-zh-cn\watch.log"
Write-Host ""
Write-Host "Disable (keep task definition): Disable-ScheduledTask -TaskName $TaskName"
Write-Host "Remove:                        .\uninstall-watch.ps1"
Write-Host "Manual read-only detect:       .\watch.ps1 -Detect"
