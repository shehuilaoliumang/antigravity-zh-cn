# Antigravity Desktop 简体中文补丁 - 更新检测与等待重打
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

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
}

$Node = Find-Node
$watchArgs = @('watch.mjs', $Mode)
foreach ($a in $args) {
    if ($a -eq '-Detect' -or $a -eq '--detect') { continue }
    $watchArgs += $a
}
& $Node @watchArgs
exit $LASTEXITCODE
