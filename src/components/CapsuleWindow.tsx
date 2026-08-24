import { FormEvent, useCallback, useEffect, useState } from "react";
import { lazy, Suspense } from "react";
import type { OmegaState } from "../types";
import { CapsuleScene } from "./CapsuleScene";
import { getCleanCapsuleDialogue, applyMilestoneReward } from "../systems/storyMilestones";
import DecorationPanel from "./DecorationPanel";
import BookshelfPanel from "./BookshelfPanel";
import M0Prologue from "./M0Prologue";
// Lazy Room2Scene (pixi.js v7 API mismatch)

type Props = {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
};

export function CapsuleWindow({ state, updateState }: Props) {
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

  // Pre-prologue: show M0 开篇序章
  if (!state.prologueDone) {
    return <M0Prologue state={state} updateState={updateState} />;
  }

  return (
    <main className="capsule-shell">
      <header className="capsule-topbar">
        <div>
          <strong>{'\u03A9 \u592A\u7A7A\u8231'}</strong>
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
        <Suspense fallback={<div className="desk-hint">Loading...</div>}>
          <LazyRoom2
            emotion={state.emotion}
            equippedDecorations={state.equippedDecorations ?? {}}
            onBackToMainRoom={() => setInRoom2(false)}
            lowMood={state.mood < 15}
            state={state}
            updateState={updateState}
          />
        </Suspense>
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
          onDeskInteract={state.prologueDone ? undefined : () => {}}
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
const LazyRoom2 = lazy(() => import("./Room2Scene"));
