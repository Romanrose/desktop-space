$ErrorActionPreference = "Continue"
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class OmegaFocusGame {
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@ -ErrorAction SilentlyContinue

$game = Get-Process -Name "YuanShen", "GenshinImpact" -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } |
  Sort-Object Id |
  Select-Object -First 1

if ($game) {
  [OmegaFocusGame]::ShowWindow($game.MainWindowHandle, 9) | Out-Null
  [OmegaFocusGame]::SetForegroundWindow($game.MainWindowHandle) | Out-Null
  [pscustomobject]@{
    success = $true
    pid     = $game.Id
    handle  = ('0x{0:X}' -f $game.MainWindowHandle.ToInt64())
  } | ConvertTo-Json -Compress
} else {
  [pscustomobject]@{
    success = $false
    error   = "game window not found"
  } | ConvertTo-Json -Compress
}
