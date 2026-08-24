/**
 * M0 开篇序章 — 完整演出流程
 *
 * Phase 0: Black — 2秒黑屏
 * Phase 1: Splash — 制作人名单淡入淡出
 * Phase 2: Intro — 黑屏白字对话 + 玩家选项
 * Phase 3: Nickname — 输入玩家昵称
 * Phase 4: CapsuleDialogue — 太空舱场景 + Ω 头顶对话气泡 + 选项
 * Phase 5: Tutorial — 书桌高亮引导 + 关闭提示
 */

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { OmegaEmotion, OmegaState } from "../types";
import { CapsuleScene } from "./CapsuleScene";

type Props = {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
};

type ProloguePhase =
  | "black"
  | "splash"
  | "intro"
  | "nickname"
  | "capsule_dialogue"
  | "tutorial";

type DialogueStep =
  | { role: "omega_text"; text: string; emotion?: OmegaEmotion }
  | { role: "omega_bubble"; text: string; emotion?: OmegaEmotion }
  | { role: "player_choice"; options: string[] }
  | { role: "system"; text: string };

const BLACK_DURATION = 2000;
const SPLASH_DURATION = 4000;
const FADE_DURATION = 1000;

const introSteps: DialogueStep[] = [
  { role: "omega_text", text: "你好，能听到我说话吗？", emotion: "calm_negative" },
  { role: "player_choice", options: ["你是谁？"] },
  { role: "omega_text", text: "……居然不是幻觉。我是Ω，也可以叫我欧米伺，蓝星星际研究院资料室的实习生。", emotion: "calm_positive" },
  { role: "player_choice", options: ["你为什么会出现在我的电脑上？"] },
  { role: "omega_text", text: "不知道，我们的世界亡灭了，我已经很久没和人这样说过话了。", emotion: "calm_negative" },
  { role: "omega_text", text: "我该怎么称呼你？", emotion: "calm_positive" },
  { role: "system", text: "nickname" },
];

const capsuleSteps: DialogueStep[] = [
  { role: "omega_bubble", text: "我这是，在一个方块里面？", emotion: "fearful" },
  { role: "player_choice", options: ["是的，这是我的电脑。"] },
  { role: "omega_bubble", text: "你可以听到我说话吗？", emotion: "shy" },
  { role: "player_choice", options: ["不能，但我能看到。"] },
  { role: "omega_bubble", text: "哦，那可能是某些高维转译器起了作用。真神奇……你就看我脑袋顶上的字幕吧，你是三维生物吗？", emotion: "calm_positive" },
  { role: "player_choice", options: ["呃，或许是？"] },
  { role: "omega_bubble", text: "我读过一些研究你们的书，但院士们的预测和现在的状况完全不一样。", emotion: "calm_negative" },
  { role: "omega_bubble", text: "那我可以在你的电脑里呆着吗？", emotion: "shy" },
  { role: "player_choice", options: ["当然可以。"] },
  { role: "omega_bubble", text: "谢谢你，我应该不会占用它太长时间。我的心境值很低，应该很快就会死。", emotion: "calm_negative" },
  { role: "player_choice", options: ["心境值，那是什么？"] },
  { role: "omega_bubble", text: "可以理解为描述心理状态和健康程度的指数——我期待这一天很久了。", emotion: "calm_positive" },
  { role: "system", text: "tutorial" },
];

// ======================= Typewriter Text Component =======================

function TypewriterText({ text, speed = 35, active = true }: {
  text: string;
  speed?: number;
  active?: boolean;
}) {
  const [displayed, setDisplayed] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayed("");
    if (!active || !text) return;

    let idx = 0;
    timerRef.current = setInterval(() => {
      idx += 1;
      if (idx >= text.length) {
        setDisplayed(text);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
      } else {
        setDisplayed(text.slice(0, idx));
      }
    }, speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text, speed, active]);

  if (!active) return <>{text}</>;
  return <>{displayed}</>;
}

// ======================= Component =======================

export default function M0Prologue({ state, updateState }: Props) {
  const [phase, setPhase] = useState<ProloguePhase>("black");
  const [splashFade, setSplashFade] = useState<"in" | "show" | "out">("in");
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [nickname, setNickname] = useState(state.nickname || "");
  const [omegaExpression, setOmegaExpression] = useState<OmegaEmotion>("calm_negative");
  const [deskHighlighted, setDeskHighlighted] = useState(false);
  const [showCloseHint, setShowCloseHint] = useState(false);
  const [typewriterActive, setTypewriterActive] = useState(false);
  const [typewriterKey, setTypewriterKey] = useState(0);

  const lastOmegaBubbleRef = useRef<{ text: string; emotion: OmegaEmotion } | null>(null);
  const capsuleShellRef = useRef<HTMLDivElement>(null);

  // ---------- Black screen (2s) ----------
  useEffect(() => {
    if (phase !== "black") return;
    const t = setTimeout(() => setPhase("splash"), BLACK_DURATION);
    return () => clearTimeout(t);
  }, [phase]);

  // ---------- Splash ----------
  useEffect(() => {
    if (phase !== "splash") return;
    const t1 = setTimeout(() => setSplashFade("show"), FADE_DURATION);
    const t2 = setTimeout(() => {
      setSplashFade("out");
      setTimeout(() => { setPhase("intro"); setSplashFade("in"); }, FADE_DURATION);
    }, SPLASH_DURATION + FADE_DURATION);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);

  // ---------- Dialogue logic ----------
  const currentStep = phase === "intro"
    ? introSteps[dialogueIdx]
    : phase === "capsule_dialogue"
      ? capsuleSteps[dialogueIdx]
      : null;

  const handleOmegaTextContinue = useCallback(() => {
    setDialogueIdx((i) => i + 1);
    setTypewriterActive(false);
    setTypewriterKey((k) => k + 1);
  }, []);

  const handlePlayerChoice = useCallback((_index: number) => {
    setDialogueIdx((i) => i + 1);
  }, []);

  useEffect(() => {
    if (phase !== "intro" && phase !== "capsule_dialogue") return;
    if (!currentStep) return;

    if (currentStep.role === "system") {
      if (currentStep.text === "nickname") { setPhase("nickname"); setDialogueIdx(0); }
      else if (currentStep.text === "tutorial") { setPhase("tutorial"); setDeskHighlighted(true); setShowCloseHint(true); }
      return;
    }

    if (currentStep.role === "omega_text" || currentStep.role === "omega_bubble") {
      const e = (currentStep as any).emotion ?? "calm_negative";
      setOmegaExpression(e);
      if (currentStep.role === "omega_bubble") {
        lastOmegaBubbleRef.current = { text: (currentStep as any).text, emotion: e };
      }
      setTypewriterActive(true);
      setTypewriterKey((k) => k + 1);
    } else if (currentStep.role === "player_choice") {
      setTypewriterActive(false);
    }
  }, [phase, currentStep, dialogueIdx]);

  // ---------- Nickname submit ----------
  const handleNicknameSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    await updateState({ nickname: nickname.trim() });
    setPhase("capsule_dialogue");
    setDialogueIdx(0);
    setTypewriterActive(true);
    setTypewriterKey((k) => k + 1);
  }, [nickname, updateState]);

  // ---------- Finish prologue ----------
  const finishPrologue = useCallback(async () => {
    await updateState({
      prologueDone: true, currentMode: "idle",
      mood: Math.max(30, state.mood + 5), affinity: Math.max(0, state.affinity + 1),
      emotion: "calm_positive", lastActiveTime: Date.now(),
    });
    await window.omega.window.showFloating();
    await window.omega.window.closeCapsule();
  }, [state, updateState]);

  // ====== Render ======

  if (phase === "black") return <main className="m0-black" />;

  if (phase === "splash") {
    return (
      <main className="m0-splash">
        <div className={"m0-splash__content m0-splash__content--" + splashFade}>
          <p className="m0-splash__label">制作人</p>
          <p className="m0-splash__names">纸折鱼 &middot; Romanrose &middot; 合金 &middot; 固执</p>
        </div>
      </main>
    );
  }

  if (phase === "intro") {
    if (!currentStep) return null;
    return (
      <main className="m0-intro">
        <div className="m0-intro__dialogue">
          {currentStep.role === "omega_text" && (
            <div className="m0-intro__line">
              <span className="m0-intro__speaker">Ω</span>
              <p className="m0-intro__text">
                <TypewriterText text={currentStep.text} active={typewriterActive} />
              </p>
              <button type="button" className="m0-intro__continue" onClick={handleOmegaTextContinue}>
                继续
              </button>
            </div>
          )}
          {(currentStep as any).role === "player_choice" && (
            <div className="m0-intro__choices">
              {(currentStep as any).options.map((opt: string, i: number) => (
                <button key={i} type="button" className="m0-intro__choice-btn" onClick={() => handlePlayerChoice(i)}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  if (phase === "nickname") {
    return (
      <main className="m0-intro">
        <form className="m0-intro__nickname-form" onSubmit={handleNicknameSubmit}>
          <p className="m0-intro__nickname-question">
            <span className="m0-intro__speaker">Ω</span>
          </p>
          <p className="m0-intro__nickname-hint">我该怎么称呼你？</p>
          <div className="m0-intro__nickname-row">
            <input className="m0-intro__nickname-input" value={nickname}
              onChange={(e) => setNickname(e.currentTarget.value)}
              placeholder="输入你的昵称..." autoFocus maxLength={20} />
            <button type="submit" className="m0-intro__nickname-submit">确定</button>
          </div>
        </form>
      </main>
    );
  }

  if (phase === "capsule_dialogue") {
    if (!currentStep) return null;
    const showNicknameReply = dialogueIdx === 0;
    const isPlayerChoice = !showNicknameReply && (currentStep as any).role === "player_choice";
    const lastBubble = lastOmegaBubbleRef.current;
    return (
      <main className="capsule-shell" ref={capsuleShellRef}>
        <header className="capsule-topbar"><div><strong>Ω 太空舱</strong></div></header>
        <CapsuleScene
          prologueDone={false} emotion={omegaExpression} mood={state.mood}
          equippedDecorations={state.equippedDecorations ?? {}}
          capsuleBackgroundDirty={state.capsuleBackgroundDirty} deskHighlighted={false}
        />
        <div className="m0-capsule-overlay">
          {showNicknameReply && (
            <div className="m0-capsule-bubble">
              <div className="m0-capsule-bubble__tail" />
              <p className="m0-capsule-bubble__text">哦，好的……很高兴认识你，<strong>{nickname || state.nickname || "你"}</strong>……</p>
              <button type="button" className="m0-intro__continue m0-intro__continue--light" onClick={() => setDialogueIdx(1)}>继续</button>
            </div>
          )}
          {!showNicknameReply && currentStep.role === "omega_bubble" && (
            <div className="m0-capsule-bubble">
              <div className="m0-capsule-bubble__tail" />
              <p className="m0-capsule-bubble__text"><TypewriterText text={currentStep.text} active={typewriterActive} /></p>
              <button type="button" className="m0-intro__continue m0-intro__continue--light" onClick={handleOmegaTextContinue}>继续</button>
            </div>
          )}
          {isPlayerChoice && (
            <div className="m0-capsule-choices-area">
              {lastBubble && (
                <div className="m0-capsule-bubble m0-capsule-bubble--static">
                  <div className="m0-capsule-bubble__tail" />
                  <p className="m0-capsule-bubble__text">{lastBubble.text}</p>
                </div>
              )}
              <div className="m0-capsule-choices">
                {(currentStep as any).options.map((opt: string, i: number) => (
                  <button key={i} type="button" className="m0-intro__choice-btn m0-intro__choice-btn--light" onClick={() => handlePlayerChoice(i)}>{opt}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (phase === "tutorial") {
    return (
      <main className="capsule-shell" ref={capsuleShellRef}>
        <header className="capsule-topbar">
          <div><strong>Ω 太空舱</strong></div>
          <button type="button" className="m0-tutorial__close-btn" onClick={finishPrologue}>关闭太空舱</button>
        </header>
        <CapsuleScene
          prologueDone={false} emotion="calm_positive" mood={state.mood}
          equippedDecorations={state.equippedDecorations ?? {}}
          capsuleBackgroundDirty={state.capsuleBackgroundDirty}
          deskHighlighted={true} onDeskInteract={finishPrologue}
        />
        {showCloseHint && (
          <div className="m0-tutorial__hint">
            <p className="m0-tutorial__hint-text"><span className="m0-tutorial__hint-icon">💡</span>靠近书桌点击坐下</p>
            <p className="m0-tutorial__hint-sub">或点击右上角「关闭太空舱」启动悬浮窗</p>
          </div>
        )}
      </main>
    );
  }

  return null;
}
