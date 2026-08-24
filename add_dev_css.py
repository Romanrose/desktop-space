# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding="utf-8")

FILE = "src/styles/app.css"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

css = """
/* ===== 开发者选项面板 ===== */
.dev-gear-btn {
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
}
.dev-gear-btn:hover {
  background: rgba(0, 204, 255, 0.2);
  color: #00ccff;
  border-color: rgba(0, 204, 255, 0.5);
}

.dev-panel {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 420px;
  max-height: 80vh;
  background: rgba(10, 18, 25, 0.97);
  border: 1px solid rgba(0, 204, 255, 0.3);
  border-radius: 12px;
  z-index: 100;
  overflow: hidden;
  backdrop-filter: blur(12px);
}
.dev-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 204, 255, 0.15);
}
.dev-panel__header h2 {
  margin: 0;
  font-size: 15px;
  color: #00ccff;
  font-weight: 700;
}
.dev-panel__header button {
  background: none;
  border: 1px solid rgba(0, 204, 255, 0.2);
  color: rgba(0, 204, 255, 0.6);
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}
.dev-panel__header button:hover {
  background: rgba(0, 204, 255, 0.15);
  color: #00ccff;
}
.dev-panel__body {
  padding: 16px;
  overflow-y: auto;
  max-height: calc(80vh - 52px);
}
.dev-panel__row {
  margin-bottom: 14px;
}
.dev-panel__row label {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 6px;
}
.dev-panel__input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}
.dev-panel__input-group input[type="range"] {
  flex: 1;
  accent-color: #00ccff;
  height: 4px;
}
.dev-panel__number {
  width: 70px;
  padding: 4px 6px;
  border: 1px solid rgba(0, 204, 255, 0.2);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 13px;
  text-align: center;
}
.dev-panel__input-group button {
  padding: 4px 10px;
  border: 1px solid rgba(0, 204, 255, 0.3);
  border-radius: 4px;
  background: rgba(0, 204, 255, 0.12);
  color: #00ccff;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.dev-panel__input-group button:hover {
  background: rgba(0, 204, 255, 0.25);
}
.dev-panel__current {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  margin-top: 4px;
}
.dev-panel__divider {
  border: none;
  border-top: 1px solid rgba(0, 204, 255, 0.1);
  margin: 16px 0;
}
.dev-panel__milestones label {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}
.dev-panel__hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 10px 0;
  line-height: 1.4;
}
.dev-panel__milestone-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dev-panel__milestone-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.dev-panel__milestone-item--done {
  border-color: rgba(0, 204, 255, 0.12);
  background: rgba(0, 204, 255, 0.04);
}
.dev-panel__milestone-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}
.dev-panel__milestone-item button {
  padding: 3px 10px;
  border: 1px solid rgba(255, 80, 80, 0.3);
  border-radius: 4px;
  background: rgba(255, 80, 80, 0.1);
  color: #ff6666;
  font-size: 11px;
  cursor: pointer;
}
.dev-panel__milestone-item button:hover:not(:disabled) {
  background: rgba(255, 80, 80, 0.25);
}
.dev-panel__milestone-item button:disabled,
.dev-panel__btn-disabled {
  opacity: 0.3;
  cursor: not-allowed;
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.03);
}
"""

content += css
with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)
print("CSS added!")
