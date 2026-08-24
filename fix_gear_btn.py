# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding="utf-8")

FILE = "src/styles/app.css"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Find the gear button CSS and make it more prominent
old = """.dev-gear-btn {
  position: absolute;
  right: 8px;
  top: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(0, 204, 255, 0.2);
  background: rgba(0, 204, 255, 0.08);
  color: rgba(0, 204, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
  padding: 0;
  line-height: 1;
}"""

new = """.dev-gear-btn {
  position: absolute;
  right: 14px;
  top: 14px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(0, 204, 255, 0.35);
  background: rgba(0, 0, 0, 0.3);
  color: rgba(0, 204, 255, 0.8);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 20;
  padding: 0;
  line-height: 1;
  backdrop-filter: blur(4px);
  box-shadow: 0 0 8px rgba(0, 204, 255, 0.15);
}"""

content = content.replace(old, new)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Gear button CSS updated!")
