# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding="utf-8")

FILE = "src/components/FloatingWindow.tsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# ============================================================
# 1. Add showDevTools state
# ============================================================
old = '  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);'
new = old + '\n  const [showDevTools, setShowDevTools] = useState(false);'
assert old in content, "State addition anchor not found!"
content = content.replace(old, new)

# ============================================================
# 2. Add gear button after status line
# ============================================================
old = '      </p>\n\n      {/* 低心境专属提示 */}'
new = r"""      </p>

      {/* 开发者齿轮按钮 */}
      <button
        type="button"
        className="dev-gear-btn"
        onClick={(e) => {
          e.stopPropagation();
          closePanel();
          setMenu(null);
          setShowDevTools((v) => !v);
        }}
        aria-label="开发者选项"
        title="开发者选项"
      >
        ⚙
      </button>

      {/* 低心境专属提示 */}"""
assert old in content, "Gear button anchor not found!"
content = content.replace(old, new)

# ============================================================
# 3. Add DevPanel before </main>
# ============================================================
old = r"""      {panel === "alarm" && (
        <AlarmPanel
          nickname={state.nickname}
          closePanel={closePanel}
          setClickBubble={setClickBubble}
        />
      )}
    </main>"""
new = r"""      {panel === "alarm" && (
        <AlarmPanel
          nickname={state.nickname}
          closePanel={closePanel}
          setClickBubble={setClickBubble}
        />
      )}

      {/* 开发者面板 */}
      {showDevTools && (
        <DevPanel
          state={state}
          updateState={updateState}
          onClose={() => setShowDevTools(false)}
          setClickBubble={setClickBubble}
        />
      )}
    </main>"""
assert old in content, "DevPanel insertion anchor not found!"
content = content.replace(old, new)

# ============================================================
# 4. Add DevPanel component function
# ============================================================
old = """}

/* 闹钟面板组件 */
function AlarmPanel({"""
new = """}

/* 开发者面板组件 */
function DevPanel({
  state,
  updateState,
  onClose,
  setClickBubble,
}: {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
  onClose: () => void;
  setClickBubble: (msg: string | null) => void;
}) {
  const [moodInput, setMoodInput] = useState(String(state.mood));
  const [affinityInput, setAffinityInput] = useState(String(state.affinity));

  async function applyMood() {
    const val = Math.max(15, Math.min(1000, parseInt(moodInput) || 15));
    await updateState({ mood: val });
    setMoodInput(String(val));
    setClickBubble("心境值已设置为 " + val);
    setTimeout(() => setClickBubble(null), 2000);
  }

  async function applyAffinity() {
    const val = Math.max(0, parseInt(affinityInput) || 0);
    await updateState({ affinity: val });
    setAffinityInput(String(val));
    setClickBubble("亲密度已设置为 " + val);
    setTimeout(() => setClickBubble(null), 2000);
  }

  async function retriggerMilestone(milestoneId: string) {
    const current = state.completedMilestones ?? [];
    if (!current.includes(milestoneId)) {
      setClickBubble("该剧情节点尚未完成，无法重新触发");
      setTimeout(() => setClickBubble(null), 2000);
      return;
    }
    const updated = current.filter((m) => m !== milestoneId);
    await updateState({ completedMilestones: updated, pendingMilestoneEvent: null });
    setClickBubble("已重置: " + milestoneId + "，返回桌面后条件满足时会重新触发");
    setTimeout(() => setClickBubble(null), 3000);
  }

  const milestoneLabels: Record<string, string> = {
    m1_first_greeting: "M1 首次问候 (mood > 50)",
    m2_clean_capsule: "M2 清洁太空舱 (mood >= 100)",
    m3_show_world: "M3 展示世界 (mood >= 100, affinity >= 50)",
    m4_childhood_story: "M4 童年故事 (mood >= 200, affinity > 50)",
    m5_construction: "M5 建造 (mood >= 300, unlocked.construction)",
    m6_game_unlock: "M6 游戏解锁",
    m7_writing: "M7 写作 (mood > 500, affinity > 50)",
  };

  const completedSet = new Set(state.completedMilestones ?? []);

  return (
    <section className="floating-panel dev-panel">
      <header className="dev-panel__header">
        <h2>开发者选项</h2>
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </header>

      <div className="dev-panel__body">
        {/* 心境值调节 */}
        <div className="dev-panel__row">
          <label>心境值 (15-1000)</label>
          <div className="dev-panel__input-group">
            <input
              type="range"
              min={15}
              max={1000}
              value={moodInput}
              onChange={(e) => setMoodInput(e.target.value)}
            />
            <input
              type="number"
              min={15}
              max={1000}
              value={moodInput}
              onChange={(e) => setMoodInput(e.target.value)}
              className="dev-panel__number"
            />
            <button type="button" onClick={applyMood}>
              应用
            </button>
          </div>
          <span className="dev-panel__current">当前: {state.mood}</span>
        </div>

        {/* 亲密度调节 */}
        <div className="dev-panel__row">
          <label>亲密度</label>
          <div className="dev-panel__input-group">
            <input
              type="range"
              min={0}
              max={200}
              value={affinityInput}
              onChange={(e) => setAffinityInput(e.target.value)}
            />
            <input
              type="number"
              min={0}
              max={9999}
              value={affinityInput}
              onChange={(e) => setAffinityInput(e.target.value)}
              className="dev-panel__number"
            />
            <button type="button" onClick={applyAffinity}>
              应用
            </button>
          </div>
          <span className="dev-panel__current">当前: {state.affinity}</span>
        </div>

        <hr className="dev-panel__divider" />

        {/* 主线剧情节点重触发 */}
        <div className="dev-panel__milestones">
          <label>主线剧情节点</label>
          <p className="dev-panel__hint">点击按钮从 completedMilestones 中移除该节点，返回桌面后条件满足时会重新触发</p>
          <div className="dev-panel__milestone-list">
            {ALL_MILESTONES.map((id) => {
              const done = completedSet.has(id);
              const label = milestoneLabels[id] || id;
              return (
                <div
                  key={id}
                  className={`dev-panel__milestone-item ${done ? "dev-panel__milestone-item--done" : ""}`}
                >
                  <span className="dev-panel__milestone-label">
                    {done ? "✓ " : ""}{label}
                  </span>
                  <button
                    type="button"
                    disabled={!done}
                    onClick={() => retriggerMilestone(id)}
                    className={done ? "" : "dev-panel__btn-disabled"}
                  >
                    重新触发
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* 闹钟面板组件 */
function AlarmPanel({"""
assert old in content, "Component function anchor not found!"
content = content.replace(old, new)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("All 4 changes applied!")
