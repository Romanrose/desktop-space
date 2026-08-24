const fs = require("fs");
const path = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/main.ts";
let content = fs.readFileSync(path, "utf8");

// Replace the broken getActiveWindowTitle function
const oldFunc = `function getActiveWindowTitle(): string {\r\n  try {\r\n    const result = execFileSync(\r\n      "powershell.exe",\r\n      [\r\n        "-NoProfile",\r\n        "-Command",\r\n        \'& {Add-Type -Name W -Namespace A -MemberDefinition \' +\r\n          "\\\'[DllImport(\\\\"user32.dll\\\\")]public static extern IntPtr GetForegroundWindow();" +\r\n          "[DllImport(\\\\"user32.dll\\\\")]public static extern int GetWindowText(IntPtr h,System.Text.StringBuilder t,int c);\\\' " +\r\n          "|Out-Null;\\\'$s=New-Object System.Text.StringBuilder 256;" +\r\n          "[A.W]::GetWindowText([A.W]::GetForegroundWindow(),\\\'$s,256)|Out-Null;\\\'$s.ToString()"\r\n      ],\r\n      { timeout: 2000, encoding: "utf8" }\r\n    ).trim();\r\n    return result || "";\r\n  } catch {\r\n    return "";\r\n  }\r\n}`;

const newFunc = `function getActiveWindowTitle(): string {\r\n  try {\r\n    const result = execFileSync(\r\n      "powershell.exe",\r\n      [\r\n        "-NoProfile",\r\n        "-Command",\r\n        \`& {Add-Type -Name W -Namespace A -MemberDefinition '[DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();[DllImport("user32.dll")]public static extern int GetWindowText(IntPtr h,System.Text.StringBuilder t,int c);';$s=New-Object System.Text.StringBuilder 256;[A.W]::GetWindowText([A.W]::GetForegroundWindow(),$s,256)|Out-Null;$s.ToString()}\`\r\n      ],\r\n      { timeout: 2000, encoding: "utf8" }\r\n    ).trim();\r\n    return result || "";\r\n  } catch {\r\n    return "";\r\n  }\r\n}`;

content = content.replace(oldFunc, newFunc);

fs.writeFileSync(path, content, "utf8");
console.log("Fixed");
