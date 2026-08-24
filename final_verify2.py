# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding="utf-8")

FILES = {
    "main.ts": r"C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts",
    "bridge.ts": r"C:\Users\89682\Desktop\game competition\minigame\omega\game\src\browserBridge.ts",
}

contents = {}
for name, path in FILES.items():
    with open(path, "r", encoding="utf-8") as f:
        contents[name] = f.read()

checks = [
    # main.ts
    ("main.ts 无 ??? prompt", "???????????????????" not in contents["main.ts"]),
    ("main.ts 有 背景故事", "【背景故事】" in contents["main.ts"]),
    ("main.ts 有 性格特点", "【性格特点】" in contents["main.ts"]),
    ("main.ts 有 语言风格", "【语言风格】" in contents["main.ts"]),
    ("main.ts 有 情绪状态说明", "【情绪状态说明】" in contents["main.ts"]),
    ("main.ts 有 输出格式", "【输出格式】" in contents["main.ts"]),
    ("main.ts 有 蓝星星际研究院", "蓝星星际研究院" in contents["main.ts"]),
    ("main.ts 有 📝", "📝" in contents["main.ts"]),
    ("main.ts 有 【玩家说】", "【玩家说】" in contents["main.ts"]),
    ("main.ts 有 当前屏幕的截图", "当前屏幕的截图" in contents["main.ts"]),
    ("main.ts 有 我在这里 choice", "「我在这里」" in contents["main.ts"]),
    ("main.ts 有 我在听 choice", "「我在听」" in contents["main.ts"]),
    # browserBridge.ts
    ("bridge.ts 有 偶尔抬头确认你还在", "偶尔抬头确认你还在" in contents["bridge.ts"]),
    ("bridge.ts 有 时间到了就来叫你", "时间到了就来叫你" in contents["bridge.ts"]),
    ("bridge.ts 有 不太擅长把感谢说得自然", "不太擅长把感谢说得自然" in contents["bridge.ts"]),
]

all_pass = True
for name, result in checks:
    status = "✅" if result else "❌"
    if not result:
        all_pass = False
    print(f"{status} {name}")

print(f"\n{'✅ All checks passed!' if all_pass else '⚠️  Some checks failed!'}")
