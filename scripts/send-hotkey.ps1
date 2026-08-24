<#
.SYNOPSIS
  Omega -> BetterGI 热键注入脚本
.DESCRIPTION
  通过 user32.keybd_event 向 BetterGI 注入一个虚拟键码，
  用于触发 BetterGI 已注册的“键鼠监听”快捷键。
#>

param(
  [Parameter(Mandatory = $true)]
  [int]$VkCode
)

$sig = @"
using System;
using System.Runtime.InteropServices;
public static class OmegaHotkeyInjector {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@

Add-Type -TypeDefinition $sig -ErrorAction Stop

[OmegaHotkeyInjector]::keybd_event([byte]$VkCode, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 30
[OmegaHotkeyInjector]::keybd_event([byte]$VkCode, 0, 2, [UIntPtr]::Zero)

$result = @{
  success = $true
  vkCode  = $VkCode
}
return $result | ConvertTo-Json -Compress
