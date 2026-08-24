import sys
sys.stdout.reconfigure(encoding='utf-8')
filepath = r'C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()
old = '你是一个屏幕识别助手。请用一句简短的中文描述这张截图中用户正在做什么、屏幕上有什么主要内容。不要评价，只需客观描述。如果无法识别，请说\u0027无法识别屏幕内容\u0027。'
new = '直接描述这张截图的内容。'
content = content.replace(old, new)
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
