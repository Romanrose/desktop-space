# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding="utf-8")

FILE = "src/styles/app.css"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Find the dev-panel CSS block and add reset for inherited floating-panel props
old = """.dev-panel {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 420px;
  max-height: 80vh;"""

new = """.dev-panel {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 440px;
  max-height: 90vh;
  right: auto;
  bottom: auto;
  padding: 0;"""

content = content.replace(old, new)

# Also increase the body max-height
old = ".dev-panel__body {\n  padding: 16px;\n  overflow-y: auto;\n  max-height: calc(80vh - 52px);"
new = ".dev-panel__body {\n  padding: 16px;\n  overflow-y: auto;\n  max-height: calc(90vh - 52px);"
content = content.replace(old, new)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed!")
