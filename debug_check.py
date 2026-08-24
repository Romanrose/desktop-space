
import sys
sys.stdout.reconfigure(encoding="utf-8")

with open(r"C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Verify the system prompt is corrupted
idx = content.find('role: "system"')
print(f"First system role at: {idx}")
# Find second occurrence
idx2 = content.find('role: "system"', idx + 50)
print(f"Second system role at: {idx2}")
sample = content[idx2:idx2+100]
print(f"Content around: {repr(sample[:80])}")
