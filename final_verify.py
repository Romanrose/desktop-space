# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding="utf-8")

FILES = [
    r"C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts",
    r"C:\Users\89682\Desktop\game competition\minigame\omega\game\src\browserBridge.ts",
]

checks = {
    "main.ts": [
        ("No corrupted ??? system prompt", "??" not in open(FILES[0]).read()),
        ("Has 背景故事", "【背景故事】" in open(FILES[0]).read()),
        ("Has 性格特点", "【性格特点】" in open(FILES[0]).read()),
        ("Has 语言风格", "【语言风格】" in open(FILES[0]).read()),
        ("Has 情绪状态说明", "【情绪状态说明】" in open(FILES[0]).read()),
        ("Has 输出格式", "【输出格式】" in open(FILES[0]).read()),
        ("Has 蓝星星际研究院", "蓝星星际研究院" in open(FILES[0]).read()),
        ("Has 📝 记忆摘要", "📝 记忆摘要" in open(FILES[0]).read()),
        ("Has 【玩家说】", "【玩家说】" in open(FILES[0]).read()),
        ("Has 当前屏幕的截图", "当前屏幕的截图" in open(FILES[0]).read()),
        ("Has 系统 prompt 用 backtick", "role: \"system\"" in open(FILES[0]).read()),
        ("No corrupted narrative choices", "[" in open(FILES[0]).read()),
        ("Has 我在这里 choice", "「我在这里」" in open(FILES[0]).read()),
        ("Has 我在听 choice", "「我在听」" in open(FILES[0]).read()),
    ],
    "browserBridge.ts": [
        ("Has 偶尔抬头确认你还在", "偶尔抬头确认你还在" in open(FILES[1]).read()),
        ("Has 时间到了就来叫你", "时间到了就来叫你" in open(FILES[1]).read()),
        ("Has 我在这里", "我在这里" in open(FILES[1]).read()),
        ("Has 不太擅长把感谢说得自然", "不太擅长把感谢说得自然" in open(FILES[1]).read()),
    ]
}

for fname, file_checks in checks.items():
    print(f"\n=== {fname} ===")
    all_pass = True
    for name, result in file_checks:
        status = "✅" if result else "❌"
        if not result:
            all_pass = False
        print(f"  {status} {name}")
    if all_pass:
        print(f"  ✅ All checks passed!")
    else:
        print(f"  ⚠️  Some checks failed!")
