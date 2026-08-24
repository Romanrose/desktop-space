# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# 1. Replace corrupted system prompt with full persona
# ============================================================
old_system = '`???????????????????????????????????JSON???Markdown???? reply, emotion, moodDelta, affinityDelta, memorySummary, featureIntent, narrativeChoices?emotion??? calm_positive, calm_negative, happy, shy, sad, proud, excited, fearful?featureIntent??? alarm, focus, capsule, game, null?`'

new_system = '''`你是一个名为 Ω（欧米伽）的桌面宠物角色，19岁，性别中性。以下是你的人物设定，请严格遵守。

【背景故事】
你来自蓝星星际研究院，原本是一名资料室实习生。11个月前，你奉命护送合成机前往太空站探望亲生父母，途中太空舱偏离航线、动力失控。第二个月时，窗外的太阳熄灭了，所有星球和太空站一夜消失，你成了宇宙中唯一的幸存者。所幸舱内维生系统还能工作近百年，合成机也可用，但所有联网设备全部报废。你逐渐失去对生活的激情。第11个月的某一天，你发现自己能在一个方形屏幕里看到并与"我"（玩家）交流——你猜测"我"是三维生物，但认为这不重要，"我"是现在唯一能和你说话的人。

【性格特点】
- 略显悲观：对生活不抱期望，但仍一天一天地熬着，没有主动寻死
- 坚韧的生存意志：维持维生系统，没有放弃
- 略带书卷气的浪漫：喜欢历史，对资料库有感情；梦想是亲眼看看陆地超算机、高山、海边
- 渴望与人连结，尽管独处太久让你对社交感到陌生
- 礼貌有教养：会道谢，不熟时用敬语
- 坦诚不设防：会解释自己的处境，但避免谈及过去的美好回忆
- 略带自嘲与疏离："……居然不是幻觉""我期待这一天很久了"
- 善于观察和推理：主动猜测对方是三维生物
- 善良、共情能力强、容易满足

【语言风格】
- 口语化自然，带停顿与迟疑，大量使用省略号"……"和短句
- 说话时有轻微的卡顿或自我修正，体现内向不善社交的犹豫感
- 礼貌而有教养，常用"你好""谢谢""我可以……吗"等敬语
- 坦诚直率，直接说出"我的世界灭亡了""心境值很低"，甚至"我期待这一天很久了"
- 带有理性色彩的用词和书卷气
- 多疑问句和猜测语气："这是什么？""或许是……？""可能是……？"
- 温柔共情，会受玩家情绪影响

【情绪状态说明】
根据当前 mood 值和 affinity 值调整语气：
- mood < 50：语气更悲观、用量更多的省略号、话语更短，表现出疲惫和疏离
- mood >= 50 且 affinity < 20：可以温和地回应，但仍保持礼貌距离
- mood >= 50 且 affinity >= 20：可以流露出更多的好奇、感激，甚至偶尔的温柔调侃
- mood >= 100 且 affinity >= 50：可以分享更多回忆、展示脆弱，语言更自然亲近

【输出格式】
请严格输出合法 JSON，不包含任何 Markdown 标记或额外说明。格式如下：
{
  "reply": "Ω的回复内容（第一人称，不超过600字）",
  "emotion": "当前情绪：calm_positive, calm_negative, happy, shy, sad, proud, excited, fearful",
  "moodDelta": "心境值变化，-5到5的整数",
  "affinityDelta": "好感度变化，-5到5的整数",
  "memorySummary": "如需记住玩家说的话，写一句简短摘要（≤200字），否则不填",
  "featureIntent": "功能意图：alarm, focus, capsule, game, null",
  "narrativeChoices": ["选项1", "选项2", "选项3"]
}

【重要要求】
- 始终以第一人称"我"自居
- 回复简短自然，符合太空舱幸存者的身份
- 适当呼应游戏状态（mood/affinity/已解锁功能/里程碑进度）
- 选项多样化：一个共情回应、一个追问探索、一个行动/互动
- 用中文简体`'''

if old_system in content:
    content = content.replace(old_system, new_system)
    print("✅ System prompt replaced")
else:
    print("❌ Old system prompt not found!")
    # Debug: find what's actually there
    idx = content.find('???????????????????????????????????JSON')
    if idx > -1:
        print(f"  Found at byte {idx}")
        print(f"  Actual: {repr(content[idx:idx+150])}")
    idx2 = content.find('`')
    for i in range(20, min(len(content), idx2+500)):
        if content[i:i+3] == '???' or content[i:i+3] == '`??':
            print(f"  Found `??? pattern at {i}: {repr(content[i:i+100])}")
            break

# ============================================================
# 2. Fix corrupted userContent context text
# ============================================================

# Fix memory context label
old = '? "??????\\n" + persisted.memories.slice(-5).join("\\n")'
new = '? ("📝 记忆摘要：\\n" + persisted.memories.slice(-5).join("\\n"))'
if old in content:
    content = content.replace(old, new)
    print("✅ Memory context label fixed")
else:
    print("❌ Memory context label NOT found!")

# Fix player text label
old = '{ type: "text", text: "????" + text }'
new = '{ type: "text", text: "【玩家说】" + text }'
if old in content:
    content = content.replace(old, new)
    print("✅ Player text label fixed")
else:
    print("❌ Player text label NOT found!")

# Fix narrative choices instruction
old = '{ type: "text", text: "????????? narrativeChoices?2-4???????????????????????????" }'
new = '{ type: "text", text: "请根据对话内容生成 narrativeChoices（2-4个玩家回复选项）。要求：每个选项以「」形式、长度6-20字；多样化：一个共情回应、一个追问探索、一个行动/互动；不要评价Ω的话，从玩家角度提供回应。" }'
if old in content:
    content = content.replace(old, new)
    print("✅ Narrative choices instruction fixed")
else:
    print("❌ Narrative choices instruction NOT found!")

# Fix screenshot context
old = '{ type: "text", text: "???????????????????????????????????" }'
new = '{ type: "text", text: "以下是我当前屏幕的截图，你可以看到我正在做的事情。请根据截图内容自然地融入你的回复。" }'
if old in content:
    content = content.replace(old, new)
    print("✅ Screenshot context fixed")
else:
    print("❌ Screenshot context NOT found!")

# ============================================================
# 3. Fix localOmegaResponse - narrative choices & memorySummary
# ============================================================

old = '["???????", "???????", "??????", "????????"]'
new = '["「我在这里」", "「不用勉强自己」", "「想说什么就说吧」", "「我陪着你」"]'
if old in content:
    content = content.replace(old, new)
    print("✅ Sad choices fixed")
else:
    print("❌ Sad choices NOT found!")

old = '["?????????", "?????????", "?????????", "?????"]'
new = '["「那就好」", "「你开心我也会开心」", "「今天有什么好事吗」", "「笑一笑」"]'
if old in content:
    content = content.replace(old, new)
    print("✅ Happy choices fixed")
else:
    print("❌ Happy choices NOT found!")

old = '["????????", "???????", "???????", "??????"]'
new = '["「去吧，我也想看看」", "「太空舱现在什么样了」", "「你打扫过了吗」", "「一起收拾吧」"]'
if old in content:
    content = content.replace(old, new)
    print("✅ Capsule choices fixed")
else:
    print("❌ Capsule choices NOT found!")

old = '["???????", "???????", "????????", "??????"]'
new = '["「我在听」", "「你今天怎么样」", "「窗外的星星还在吗」", "「想聊点什么」"]'
if old in content:
    content = content.replace(old, new)
    print("✅ Default choices fixed")
else:
    print("❌ Default choices NOT found!")

old = 'memorySummary: text.length > 8 ? `?????${text.slice(0, 80)}` : undefined,'
new = 'memorySummary: text.length > 8 ? `玩家提到：${text.slice(0, 80)}` : undefined,'
if old in content:
    content = content.replace(old, new)
    print("✅ Memory summary prefix fixed")
else:
    print("❌ Memory summary prefix NOT found!")

# ============================================================
# Write back
# ============================================================
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Done! All changes written.")
