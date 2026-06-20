import { FormEvent, useCallback, useEffect, useState } from "react";
import type { OmegaState } from "../types";
import { CapsuleScene } from "./CapsuleScene";
import { getCleanCapsuleDialogue, applyMilestoneReward } from "../systems/storyMilestones";
import DecorationPanel from "./DecorationPanel";
import BookshelfPanel from "./BookshelfPanel";
import Room2Scene from "./Room2Scene";

type Props = {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
};

export function CapsuleWindow({ state, updateState }: Props) {
  const [step, setStep] = useState(state.prologueDone ? 3 : 0);
  const [nickname, setNickname] = useState(state.nickname);
  const [sleeping, setSleeping] = useState(false);
  const [sleepCountdown, setSleepCountdown] = useState(60);
  const [cleanDialogueIndex, setCleanDialogueIndex] = useState(-1);
  const [decorating, setDecorating] = useState(false);
  const [inRoom2, setInRoom2] = useState(false);
  const [bookshelfShow, setBookshelfShow] = useState(false);
  const canDecorate = state.prologueDone && !sleeping;
  const cleanDialogue = state.completedMilestones.includes("m2_clean_capsule")
    ? null
    : state.pendingMilestoneEvent?.includes("clean")
      ? getCleanCapsuleDialogue()
      : null;

  const lowMoodGuide = !state.prologueDone ? false : state.mood < 15;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (sleeping && sleepCountdown > 0) {
      timer = setInterval(() => {
        setSleepCountdown((prev) => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            setSleeping(false);
            updateState({
              mood: Math.max(30, state.mood + 10),
              emotion: "calm_positive",
              currentMode: "idle",
            }).catch(() => {});
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sleeping, sleepCountdown, state.mood, updateState]);

  const handleBedRest = useCallback(async () => {
    setSleeping(true);
    setSleepCountdown(60);
  }, []);

  useEffect(() => {
    if (
      cleanDialogue &&
      !state.completedMilestones.includes("m2_clean_capsule") &&
      cleanDialogueIndex === -1
    ) {
      setCleanDialogueIndex(0);
    }
  }, [cleanDialogue, cleanDialogueIndex, state.completedMilestones]);

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
      lastActiveTime: Date.now(),
    });
    await window.omega.window.showFloating();
    await window.omega.window.closeCapsule();
  }

  if (!state.prologueDone && step < 2) {
    return (
      <main className="prologue-screen">
        {step === 0 && (
          <section className="prologue-copy">
            <p>{'\u201C\u2026\u2026\u4F60\u80FD\u770B\u89C1\u6211\uFF1F\u201D'}</p>
            <p>{'\u8FD9\u91CC\u4E0D\u662F\u84DD\u661F\uFF0C\u4E5F\u4E0D\u662F\u592A\u7A7A\u7AD9\u3002\u7A97\u5916\u7684\u6052\u661F\u5DF2\u7ECF\u7184\u706D\u5F88\u4E45\u4E86\u3002'}</p>
            <button type="button" onClick={() => setStep(1)}>
              {'\u4F60\u662F\u8C01\uFF1F'}
            </button>
          </section>
        )}
        {step === 1 && (
          <form className="nickname-form" onSubmit={submitNickname}>
            <p>{'\u6211\u53EB\u03A9\u3002\u7EF4\u5EA6\u7FFB\u8BD1\u5668\u628A\u4F60\u7684\u58F0\u97F3\u9001\u5230\u4E86\u8FD9\u91CC\u3002'}</p>
            <label>
              {'\u6211\u5E94\u8BE5\u600E\u4E48\u79F0\u547C\u4F60\uFF1F'}
              <input
                value={nickname}
                onChange={(event) => setNickname(event.currentTarget.value)}
                autoFocus
              />
            </label>
            <button type="submit">{'\u786E\u5B9A'}</button>
          </form>
        )}
      </main>
    );
  }

  return (
    <main className="capsule-shell">
      <header className="capsule-topbar">
        <div>
          <strong>{'\u03A9 \u592A\u7A7A\u8231'}</strong>
          {!state.prologueDone && (
            <span>{'WASD \u79FB\u52A8\uFF0C\u9760\u8FD1\u4E66\u684C\u540E\u5355\u51FB\u4EA4\u4E92'}</span>
          )}
          {lowMoodGuide && !sleeping && (
            <span className="low-mood-guide">
              {'\u03A9\u592A\u7D2F\u4E86\u2026\u2026\u8D70\u5230\u5E8A\u94FA\u9644\u8FD1\u4F11\u606F\u5427'}
            </span>
          )}
          {sleeping && (
            <span className="sleep-guide">
              {'\u03A9 \u6B63\u5728\u4F11\u606F\u2026 '}{sleepCountdown}s
            </span>
          )}
        </div>
        {canDecorate && !decorating && (
          <button
            type="button"
            style={{ borderColor: '#00ccff', color: '#00ccff', marginRight: 8 }}
            onClick={() => setDecorating(true)}
          >
            {'\u88C5\u4FEE'}
          </button>
        )}
        {state.room2Unlocked && !inRoom2 && !decorating && !sleeping && (
          <button
            type="button"
            style={{ borderColor: '#88ccff', color: '#88ccff', marginRight: 8 }}
            onClick={() => setInRoom2(true)}
          >
            {'\u6269\u5EFA\u533A'}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            window.omega.window.closeCapsule();
          }}
        >
          {'\u5173\u95ED\u592A\u7A7A\u8231'}
        </button>
      </header>

      {sleeping ? (
        <section className="sleep-overlay">
          <div className="sleep-overlay__content">
            <h2>{'\u03A9 \u6B63\u5728\u4F11\u606F'}</h2>
            <div className="sleep-overlay__timer">{sleepCountdown}s</div>
            <p>{'\u7761\u9192\u540E\u5FC3\u5883\u503C\u4F1A\u6062\u590D\u4E00\u4E9B'}</p>
          </div>
        </section>
      ) : cleanDialogue && cleanDialogueIndex >= 0 && cleanDialogueIndex < cleanDialogue.length ? (
        <section className="capsule-dialogue">
          <div className="capsule-dialogue__content">
            {cleanDialogue.slice(0, cleanDialogueIndex + 1).map((line, i) => (
              <p key={i} className={'capsule-dialogue__line capsule-dialogue__line--' + line.speaker}>
                <strong>{line.speaker === "omega" ? "\u03A9" : state.nickname || "\u4F60"}</strong>
                {line.text}
              </p>
            ))}
          </div>
          <button
            type="button"
            className="capsule-dialogue__next"
            onClick={() => {
              if (cleanDialogueIndex + 1 >= cleanDialogue.length) {
                applyMilestoneReward("m2_clean_capsule", state);
                updateState({
                  ...applyMilestoneReward("m2_clean_capsule", state),
                  capsuleBackgroundDirty: false,
                  pendingMilestoneEvent: null,
                }).catch(() => {});
                setCleanDialogueIndex(-1);
              } else {
                setCleanDialogueIndex(cleanDialogueIndex + 1);
              }
            }}
          >
            {cleanDialogueIndex + 1 >= cleanDialogue.length ? '\u6211\u77E5\u9053\u4E86' : '\u7EE7\u7EED'}
          </button>
        </section>
      ) : inRoom2 ? (
        <Room2Scene
          emotion={state.emotion}
          equippedDecorations={state.equippedDecorations ?? {}}
          onBackToMainRoom={() => setInRoom2(false)}
          lowMood={state.mood < 15}
          state={state}
          updateState={updateState}
        />
      ) : bookshelfShow ? (
        <BookshelfPanel
          state={state}
          updateState={updateState}
          onClose={() => setBookshelfShow(false)}
        />
      ) : decorating ? (
        <DecorationPanel
          state={state}
          updateState={updateState}
          onExit={() => setDecorating(false)}
          setClickBubble={function (msg: string | null) {
            console.log("Decoration:", msg);
          }}
        />
      ) : (
        <CapsuleScene
          prologueDone={state.prologueDone}
          emotion={state.emotion}
          mood={state.mood}
          equippedDecorations={state.equippedDecorations ?? {}}
          capsuleBackgroundDirty={state.capsuleBackgroundDirty}
          onDeskInteract={state.prologueDone ? undefined : finishPrologue}
          onBedInteract={lowMoodGuide ? handleBedRest : undefined}
          lowMood={state.mood < 15}
          room2Unlocked={state.room2Unlocked ?? false}
          onShelfInteract={() => setBookshelfShow(true)}
          onRoom2Door={() => { setInRoom2(true); }}
        />
      )}
    </main>
  );
}
