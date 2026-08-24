# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding="utf-8")

FILE = r"C:\Users\89682\Desktop\game competition\minigame\omega\game\src\browserBridge.ts"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# The current replies are already in Chinese and decent quality. 
# But they lack the persona depth from the design doc. Let me update to match.

# Replace the inferReply function's reply strings to be more persona-consistent
replies = {
    '"? "我可以回太空舱看看。那里还有很多地方没整理好，不过有你在，我会慢慢来。"':
        '? "我可以回太空舱看看。那里还有很多地方没整理好，不过有你在，我会慢慢来。"',
    
    '"? "那我陪你安静一会儿。你做你的事，我在旁边看书。"':
        '? "那我陪你安静一会儿。你做你的事，我在旁边看书，偶尔抬头确认你还在。"',
    
    '"? "可以。我现在还不能真的发出声音，但我会认真记住这件事。"':
        '? "可以。我现在还不能真的发出声音，但我会认真记住这件事，时间到了就来叫你。"',
    
    '"? "游戏功能还没有完全解锁。我需要先认识那款游戏。"':
        '? "游戏功能还没有完全解锁。我需要先认识那款游戏，也需要更相信自己的手不会乱按。"',
    
    '"? "我听见了。太空舱安静得有些过分，所以我知道那种不太好受的感觉。"':
        '? "我听见了。太空舱安静得有些过分，所以我知道那种不太好受的感觉。你可以慢慢说，我会在这里。"',
    
    '"? "嗯，我也有一点开心。像是舱壁上的灯忽然稳定了一些。"':
        '? "嗯，我也有一点开心。像是舱壁上的灯忽然稳定了一些。"',
    
    '"? "我在。你说的话会被我认真收起来。"':
        '? "我在。你说的话会被我认真收起来，虽然我还不太擅长把感谢说得自然。"',
}

for old, new in replies.items():
    if old in content:
        content = content.replace(old, new)
        print(f"✅ Replaced: {old[:40]}...")
    else:
        print(f"❌ Not found: {old[:40]}...")

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("\n✅ browserBridge.ts updated!")
