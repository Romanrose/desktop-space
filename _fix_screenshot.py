content = open(r"C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts", "r", encoding="utf-8").read()

old = '  try {\n    const response = await fetch(`${baseUrl}/chat/completions`, {\n      method: "POST",\n      headers: {'
new = '  try {\n    const controller = new AbortController();\n    const timeout = setTimeout(() => controller.abort(), 30000);\n    const response = await fetch(`${baseUrl}/chat/completions`, {\n      signal: controller.signal,\n      method: "POST",\n      headers: {'
content = content.replace(old, new)

old2 = '    return normalizeAIResponse(parseJsonResponse(raw), text);\n  } catch {\n    return null;\n  }'
new2 = '    clearTimeout(timeout);\n    return normalizeAIResponse(parseJsonResponse(raw), text);\n  } catch {\n    clearTimeout(timeout);\n    return null;\n  }'
content = content.replace(old2, new2)

open(r"C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts", "w", encoding="utf-8").write(content)
print("Done")
