import { FormEvent, useState } from "react";
import type { OmegaState } from "../types";
import { CapsuleScene } from "./CapsuleScene";

type Props = {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
};

export function CapsuleWindow({ state, updateState }: Props) {
  const [step, setStep] = useState(state.prologueDone ? 3 : 0);
  const [nickname, setNickname] = useState(state.nickname);

  async function submitNickname(event: FormEvent) {
    event.preventDefault();
    if (!nickname.trim()) return;
    await updateState({ nickname: nickname.trim(), currentMode: "prologue" });
    setStep(2);
  }

  async function finishPrologue() {
    await updateState({
      prologueDone: true,
      currentMode: "idle",
      mood: Math.max(30, state.mood + 1),
      emotion: "calm_positive",
      lastActiveTime: Date.now()
    });
    await window.omega.window.showFloating();
    await window.omega.window.closeCapsule();
  }

  if (!state.prologueDone && step < 2) {
    return (
      <main className="prologue-screen">
        {step === 0 && (
          <section className="prologue-copy">
            <p>……你能看见我？</p>
            <p>这里不是蓝星，也不是太空站。窗外的恒星已经熄灭很久了。</p>
            <button type="button" onClick={() => setStep(1)}>你是谁？</button>
          </section>
        )}
        {step === 1 && (
          <form className="nickname-form" onSubmit={submitNickname}>
            <p>我叫Ω。维度转译器把你的声音送到了这里。</p>
            <label>
              我应该怎么称呼你？
              <input value={nickname} onChange={(event) => setNickname(event.currentTarget.value)} autoFocus />
            </label>
            <button type="submit">确定</button>
          </form>
        )}
      </main>
    );
  }

  return (
    <main className="capsule-shell">
      <header className="capsule-topbar">
        <div>
          <strong>Ω 太空舱</strong>
          {!state.prologueDone && <span>WASD 移动，靠近书桌后单击交互</span>}
        </div>
        <button type="button" onClick={() => window.omega.window.closeCapsule()}>关闭太空舱</button>
      </header>
      <CapsuleScene
        prologueDone={state.prologueDone}
        emotion={state.emotion}
        onDeskInteract={state.prologueDone ? undefined : finishPrologue}
      />
    </main>
  );
}