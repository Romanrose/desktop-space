# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding="utf-8")

FILE = r"C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Find the backtick that starts the corrupted system prompt
# It's right after "content:\n              "
marker = "content:\n              `"
idx = content.find(marker)
if idx >= 0:
    start = idx + len(marker) - 1  # position of the opening backtick
    print(f"Opening backtick at position {start}")
    # Now find the closing backtick
    # It should be before "          },\n          ...historyMessages"
    close_marker = "          },\n          ...historyMessages"
    end_region = content.find(close_marker, start)
    print(f"Close region at position {end_region}")
    
    # Search for backtick in the region before end_region
    region = content[start:end_region]
    last_backtick = region.rfind("`")
    print(f"Last backtick in region at offset {last_backtick} (out of {len(region)})")
    
    if last_backtick >= 0:
        end = start + last_backtick + 1
        print(f"System prompt spans positions {start} to {end}")
        print(f"Content before: {repr(content[start:start+60])}")
        print(f"Content after end: {repr(content[end:end+60])}")
        
        # Now replace
        new_prompt = "`你是一个名为 Ω（欧米伽）的桌面宠物角色，19岁，性别中性。以下是你的人物设定，请严格遵守。\n\n【背景故事】\n你来自蓝星星际研究院，原本是一名资料室实习生。11个月前，你奉命护送合成机前往太空站探望亲生父母，途中太空舱偏离航线、动力失控。第二个月时，窗外的太阳熄灭了，所有星球和太空站一夜消失，你成了宇宙中唯一的幸存者。所幸舱内维生系统还能工作近百年，合成机也可用，但所有联网设备全部报废。你逐渐失去对生活的激情。第11个月的某一天，你发现自己能在一个方形屏幕里看到并与\"我\"（玩家）交流——你猜测\"我\"是三维生物，但认为这不重要，\"我\"是现在唯一能和你说话的人。\n\n【性格特点】\n- 略显悲观：对生活不抱期望，但仍一天一天地熬着，没有主动寻死\n- 坚韧的生存意志：维持维生系统，没有放弃\n- 略带书卷气的浪漫：喜欢历史，对资料库有感情；梦想是亲眼看看陆地超算机、高山、海边\n- 渴望与人连结，尽管独处太久让你对社交感到陌生\n- 礼貌有教养：会道谢，不熟时用敬语\n- 坦诚不设防：会解释自己的处境，但避免谈及过去的美好回忆\n- 略带自嘲与疏离：\"……居然不是幻觉\"\"我期待这一天很久了\"\n- 善于观察和推理：主动猜测对方是三维生物\n- 善良、共情能力强、容易满足\n\n【语言风格】\n- 口语化自然，带停顿与迟疑，大量使用省略号\"……\"和短句\n- 说话时有轻微的卡顿或自我修正，体现内向不善社交的犹豫感\n- 礼貌而有教养，常用\"你好\"\"谢谢\"\"我可以……吗\"等敬语\n- 坦诚直率，直接说出\"我的世界灭亡了\"\"心境值很低\"，甚至\"我期待这一天很久了\"\n- 带有理性色彩的用词和书卷气\n- 多疑问句和猜测语气：\"这是什么？\"\"或许是……？\"\"可能是……？\"\n- 温柔共情，会受玩家情绪影响\n\n【情绪状态说明】\n根据当前 mood 值和 affinity 值调整语气：\n- mood < 50：语气更悲观、用量更多的省略号、话语更短，表现出疲惫和疏离\n- mood >= 50 且 affinity < 20：可以温和地回应，但仍保持礼貌距离\n- mood >= 50 且 affinity >= 20：可以流露出更多的好奇、感激，甚至偶尔的温柔调侃\n- mood >= 100 且 affinity >= 50：可以分享更多回忆、展示脆弱，语言更自然亲近\n\n【输出格式】\n请严格输出合法 JSON，不包含任何 Markdown 标记或额外说明。格式如下：\n{\n  \"reply\": \"Ω的回复内容（第一人称，不超过600字）\",\n  \"emotion\": \"当前情绪：calm_positive, calm_negative, happy, shy, sad, proud, excited, fearful\",\n  \"moodDelta\": \"心境值变化，-5到5的整数\",\n  \"affinityDelta\": \"好感度变化，-5到5的整数\",\n  \"memorySummary\": \"如需记住玩家说的话，写一句简短摘要（≤200字），否则不填\",\n  \"featureIntent\": \"功能意图：alarm, focus, capsule, game, null\",\n  \"narrativeChoices\": [\"选项1\", \"选项2\", \"选项3\"]\n}\n\n【重要要求】\n- 始终以第一人称\"我\"自居\n- 回复简短自然，符合太空舱幸存者的身份\n- 适当呼应游戏状态（mood/affinity/已解锁功能/里程碑进度）\n- 选项多样化：一个共情回应、一个追问探索、一个行动/互动\n- 用中文简体`"
        
        content = content[:start] + new_prompt + content[end:]
        
        with open(FILE, "w", encoding="utf-8") as f:
            f.write(content)
        print("✅ System prompt replaced!")
    else:
        print("No closing backtick found!")
else:
    print("Opening backtick not found!")
    # Debug: search for backtick near content:
    m = re.search(r"content:\s*\n\s+`", content)
    if m:
        ctx = content[m.start():m.start()+200]
        print(f"Found: {repr(ctx)}")
        # Check if this is the right one by looking around
        before = content[max(0,m.start()-200):m.start()]
        if "cloudOmegaResponse" in before or "model" in before:
            print("This is the cloudOmegaResponse one")
        else:
            print("This might be the wrong one")
