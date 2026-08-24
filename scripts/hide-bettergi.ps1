$ErrorActionPreference = "Continue"
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class OmegaHideWin {
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@ -ErrorAction SilentlyContinue

while ($true) {
  Get-Process -Name "BetterGI", "BetterGenshinImpact" -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      if ($_.MainWindowHandle -ne [IntPtr]::Zero) {
        [OmegaHideWin]::ShowWindow($_.MainWindowHandle, 0) | Out-Null
      }
    } catch {}
  }
  Start-Sleep -Milliseconds 1200
}
