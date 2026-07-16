import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { Live2DModel as PixiL2D } from "pixi-live2d-display/cubism4";
import type { OmegaEmotion } from "../types";

export type AnimationId = "idle" | "click" | "angry";

interface Live2DModelProps {
  modelPath?: string;
  scale?: number;
  emotion?: OmegaEmotion;
  mousePos?: { x: number; y: number };
  animationId?: AnimationId;
  onAnimationEnd?: () => void;
}

const modelPaths: Record<AnimationId, string> = {
  idle: "/live2d/omega/omega.model3.json",
  click: "/live2d/click/click.model3.json",
  angry: "/live2d/angry/angry.model3.json",
};

const expressionNames: Record<string, string> = {
  calm_positive: "calm_positive",
  calm_negative: "calm_negative",
  happy: "happy",
  shy: "shy",
  sad: "sad",
  proud: "proud",
  excited: "excited",
  fearful: "fearful",
};

function setModelExpression(model: any, emotion: string) {
  const name = expressionNames[emotion];
  if (!name) return;
  try { model.expression(name).catch(() => {}); } catch {}
}

async function createAndAttachModel(
  app: PIXI.Application,
  path: string,
  scale: number,
  emotion: string,
) {
  const model = await PixiL2D.from(path, { autoUpdate: true, autoInteract: true });
  model.anchor.set(0.5, 0.5);

  const w = app.screen.width || 360;
  const h = app.screen.height || 520;

  let cw = 2048, ch = 2048;
  const im = model.internalModel as any;
  if (im && im.canvasSize) {
    cw = im.canvasSize[0];
    ch = im.canvasSize[1];
  }

  const s = Math.min((w * 0.75) / cw, (h * 0.85) / ch) * scale;
  model.scale.set(s);
  model.position.set(w / 2, h / 2);
  app.stage.addChild(model);

  setModelExpression(model, emotion);

  return model;
}

export default function OmegaLive2DModel({
  modelPath: _propPath,
  scale = 1,
  emotion = "calm_negative",
  mousePos = { x: 0.5, y: 0.5 },
  animationId = "idle",
  onAnimationEnd,
}: Live2DModelProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<any>(null);
  const prevAnimRef = useRef(animationId);

  // Init PIXI app once, load initial model
  useEffect(() => {
    if (!divRef.current) return;
    const el = divRef.current;
    const w = el.clientWidth || 360;
    const h = el.clientHeight || 520;

    let app: PIXI.Application;
    try {
      app = new PIXI.Application({
        width: w,
        height: h,
        backgroundAlpha: 0,
        antialias: true,
        resolution: 1,
        autoDensity: false,
      });
      el.appendChild(app.view as HTMLCanvasElement);
      appRef.current = app;
    } catch {
      return;
    }

    const path = modelPaths[animationId] || modelPaths.idle;
    createAndAttachModel(app, path, scale, emotion)
      .then((model) => {
        modelRef.current = model;

        if (animationId === "click" && onAnimationEnd) {
          setTimeout(() => onAnimationEnd(), 2000);
        }
      })
      .catch((err) => console.error("[Live2D] load error:", err));

    const handleResize = () => {
      if (!appRef.current || !divRef.current) return;
      const cw = divRef.current.clientWidth || 360;
      const ch = divRef.current.clientHeight || 520;
      appRef.current.renderer.resize(cw, ch);
      if (modelRef.current) modelRef.current.position.set(cw / 2, ch / 2);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (modelRef.current) {
        try { modelRef.current.destroy(); } catch {}
        modelRef.current = null;
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch model on animation change
  useEffect(() => {
    if (prevAnimRef.current === animationId || !appRef.current) return;
    prevAnimRef.current = animationId;

    const app = appRef.current;
    const path = modelPaths[animationId];
    if (!path) return;

    if (modelRef.current) {
      try { modelRef.current.destroy(); } catch {}
      modelRef.current = null;
    }

    createAndAttachModel(app, path, scale, emotion)
      .then((model) => {
        modelRef.current = model;
        if (animationId === "click" && onAnimationEnd) {
          setTimeout(() => onAnimationEnd(), 2000);
        }
      })
      .catch((err) => console.error("[Live2D] switch error:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationId]);

  // Update expression
  useEffect(() => {
    if (modelRef.current) setModelExpression(modelRef.current, emotion);
  }, [emotion]);

  // Eye tracking
  useEffect(() => {
    const m = modelRef.current;
    if (!m) return;
    try { m.focus((mousePos.x - 0.5) * 200, -(mousePos.y - 0.5) * 200); } catch {}
  }, [mousePos]);

  return (
    <div ref={divRef} style={{ width: "100%", height: "100%", overflow: "hidden" }} />
  );
}
