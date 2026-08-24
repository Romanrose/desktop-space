<#
.SYNOPSIS
  Omega 代打引擎一键启动封装脚本
.DESCRIPTION
  查找并启动 BetterGI 可执行文件，支持命令行参数（startOneDragon / --startGroups / start 等）。
  -Silent 时启动后持续尝试隐藏主窗口，避免玩家看到第三方工具界面。
#>

param(
  [Parameter(Mandatory = $false)]
  [string]$BetterGIPath = "",

  [Parameter(Mandatory = $false, ValueFromRemainingArguments = $true)]
  [string[]]$Arguments = @(),

  [Parameter(Mandatory = $false)]
  [switch]$Wait = $false,

  [Parameter(Mandatory = $false)]
  [switch]$Silent = $false
)

$ErrorActionPreference = "Continue"

# 搜索优先级：参数 > 项目内目录 > 常见安装路径
$searchPaths = @()
if ($BetterGIPath -and (Test-Path $BetterGIPath)) {
  $searchPaths = @($BetterGIPath)
}
else {
  $projectDir = Split-Path -Parent $PSScriptRoot
  $searchPaths = @(
    "$projectDir\bettergi",
    "$projectDir\bettergi\BetterGI"
  )
  $searchPaths += @(
    "$env:LOCALAPPDATA\BetterGI",
    "$env:ProgramFiles\BetterGI",
    "${env:ProgramFiles(x86)}\BetterGI"
  )
}

$exeName = "BetterGI.exe"
$found = $null

foreach ($dir in $searchPaths) {
  $candidate = Join-Path $dir $exeName
  if (Test-Path $candidate) {
    $found = $candidate
    break
  }
  $candidate2 = Join-Path $dir "BetterGenshinImpact.exe"
  if (Test-Path $candidate2) {
    $found = $candidate2
    break
  }
}

if (-not $found) {
  $projectDir = Split-Path -Parent $PSScriptRoot
  $sevenZPath = Join-Path $projectDir "bettergi\BetterGI_v0.62.0.7z"
  if (Test-Path $sevenZPath) {
    Write-Error "BetterGI 压缩包已下载但未解压。请运行: powershell -ExecutionPolicy Bypass .\scripts\setup-bettergi.ps1"
    exit 2
  }
  Write-Error "BetterGI 未找到。请运行 setup-bettergi.ps1 自动下载安装，或手动放置到：`n$($searchPaths -join "`n")"
  exit 1
}

Write-Output "[OmegaEngine] 启动: $found"

$startParams = @{
  FilePath = $found
  PassThru = $true
}
if ($Silent) {
  $startParams["WindowStyle"] = "Hidden"
}
if ($Arguments.Count -gt 0) {
  $startParams["ArgumentList"] = @($Arguments)
}

$process = Start-Process @startParams
$result = @{
  success  = $true
  pid      = $process.Id
  exePath  = $found
  exeName  = Split-Path -Leaf $found
  time     = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
}

if ($Wait) {
  $process | Wait-Process
  Write-Output "[OmegaEngine] 进程已退出 (PID: $($process.Id))"
  return $result | ConvertTo-Json -Compress
}

# BetterGI 会以管理员权限重启自身；等待最终进程出现再返回，便于上层轮询。
Start-Sleep -Milliseconds 800
$liveProcess = Get-Process -Name "BetterGI" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($liveProcess) {
  $process = $liveProcess
  $result.pid = $process.Id
}
Write-Output "[OmegaEngine] 已启动 (PID: $($process.Id))"

# 静默模式下持续隐藏主窗口，直到完成自提升重启。
if ($Silent) {
  try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class OmegaEngineWin32
{
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@ -ErrorAction SilentlyContinue

    for ($i = 0; $i -lt 16; $i++) {
      $current = Get-Process -Name "BetterGI" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
      if ($current) {
        [OmegaEngineWin32]::ShowWindow($current.MainWindowHandle, 0) | Out-Null
      }
      Start-Sleep -Milliseconds 400
    }
  }
  catch {
    # 隐藏失败不影响启动结果
  }
}

return $result | ConvertTo-Json -Compress
