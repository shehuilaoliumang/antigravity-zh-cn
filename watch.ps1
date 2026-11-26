# Antigravity Desktop 简体中文补丁 - 更新检测与等待重打
# Manual helper. The scheduled task uses watch-hidden.vbs instead, so it
# does not flash a PowerShell console.
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Find-Node {
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @()
    if ($env:LOCALAPPDATA) {
        $candidates += Join-Path $env:LOCALAPPDATA 'Programs\node-v22.21.0\node.exe'
    }
    $candidates += 'C:\Program Files\nodejs\node.exe'
    foreach ($c in $candidates) {
        if (Test-Path -LiteralPath $c) { return $c }
    }
    throw '未找到 Node.js。请安装 Node.js 18+，或把它加入 PATH。'
}

$Mode = '--run'
foreach ($a in $args) {
    if ($a -eq '-Detect' -or $a -eq '--detect') { $Mode = '--detect' }
    elseif ($a -eq '-Daemon' -or $a -eq '--daemon') { $Mode = '--daemon' }
    elseif ($a -eq '-Stop' -or $a -eq '--stop') { $Mode = '--stop' }
}

$Node = Find-Node
$watchArgs = @('watch.mjs', $Mode)
foreach ($a in $args) {
    if ($a -eq '-Detect' -or $a -eq '--detect' -or $a -eq '-Daemon' -or $a -eq '--daemon' -or $a -eq '-Stop' -or $a -eq '--stop') { continue }
    $watchArgs += $a
}
& $Node @watchArgs
exit $LASTEXITCODE
