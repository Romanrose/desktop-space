import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { Live2DModel as PixiL2D } from "pixi-live2d-display/cubism4";
PixiL2D.registerTicker(PIXI.Ticker);
import type { OmegaEmotion } from "../types";

export type AnimationId = "idle" | "click" | "angry";

interface Live2DModelProps {
  modelPath?: string;
  scale?: number;
  emotion?: OmegaEmotion;
  mousePos?: { x: number; y: number };
  animationId?: AnimationId;
}

const modelPaths: Record<AnimationId, string> = {
  idle: "/live2d/omega/omega.model3.json",
  click: "/live2d/click/click.model3.json",
  angry: "/live2d/omega/omega.model3.json",
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

function getMouthOpenValue(emotion: string): number {
  return emotion === "excited" || emotion === "fearful" ? 0.4 :
         emotion === "happy" ? 0.1 :
         emotion === "sad" ? 0.08 :
         0;
}

function setModelExpression(model: any, emotion: string) {
  const name = expressionNames[emotion];
  if (!name) return;
  try { model.expression(name).catch(() => {}); } catch {}

  // Directly set mouth parameter via low-level API
  // (expression system alone may not override .moc3 default values)
  try {
    const core = model.internalModel?.coreModel;
    if (core && typeof core.setParameterValueById === "function") {
      core.setParameterValueById("ParamMouthOpenY", getMouthOpenValue(emotion));
    }
  } catch {}
}

async function createAndAttachModel(
  app: PIXI.Application,
  path: string,
  scale: number,
  emotion: string,
) {
  const model = await PixiL2D.from(path, { autoUpdate: true, autoInteract: true });
  model.anchor.set(0.5, 0.5);

  // Guard: app.destroy() sets renderer=null, which makes app.screen getter crash
  if (!app || !app.renderer) {
    console.warn("[Live2D] app destroyed before model finished loading");
    return model;
  }
  const screenW = app.screen.width;
  const screenH = app.screen.height;

  let cw = 2048, ch = 2048;
  const im = model.internalModel as any;
  if (im && im.canvasSize) {
    cw = im.canvasSize[0];
    ch = im.canvasSize[1];
  }

  const s = Math.min((screenW * 0.75) / cw, (screenH * 0.85) / ch) * scale;
  model.scale.set(s);
  model.position.set(screenW / 2, screenH / 2);
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
}: Live2DModelProps) {
  const [modelReady, setModelReady] = useState(false);
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
        resolution: Math.max(window.devicePixelRatio || 1, 2),
        autoDensity: true,
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
        setModelReady(true);
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

    const app = appRef.current;
    const path = modelPaths[animationId];
    if (!path) return;

    // idle/angry 都用 omega 模型：如果当前已加载的不是 click 模型，直接复用避免重复加载
    if ((animationId === "idle" || animationId === "angry") && modelRef.current && prevAnimRef.current !== "click") {
      if (animationId === "angry") {
        try { modelRef.current.motion("angry"); } catch {}
      }
      prevAnimRef.current = animationId;
      return;
    }

    if (modelRef.current) {
      try { modelRef.current.destroy(); } catch {}
      modelRef.current = null;
    }

    createAndAttachModel(app, path, scale, emotion)
      .then((model) => {
        modelRef.current = model;
        prevAnimRef.current = animationId;
        setModelReady(true);
      })
      .catch((err) => console.error("[Live2D] switch error:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationId]);

  // Update expression when emotion changes or model becomes ready
  useEffect(() => {
    if (modelRef.current) setModelExpression(modelRef.current, emotion);
  }, [emotion, modelReady]);

  // Force mouth parameter every frame via Pixi ticker.
  // Cubium resets parameters during internalModel.update() each frame,
  // so we must re-apply ParamMouthOpenY after the model update completes.
  useEffect(() => {
    if (!appRef.current || !modelRef.current) return;
    const ticker = appRef.current.ticker;
    let mouthCount = 0;
    function setMouthParam(core: any, name: string, val: number) {
      try { core.setParameterValueById(name, val); } catch (e) {}
    }
    const forceMouth = () => {
      const m = modelRef.current;
      if (!m) return;
      try {
        const core = m.internalModel?.coreModel;
        if (!core) return;
        if (typeof core.setParameterValueById !== "function") return;
        const val = getMouthOpenValue(emotion);
        // Set both mouth parameters
        setMouthParam(core, "ParamMouthOpenY", val);
        // Try other mouth-related parameters
        const mouthParams = ["ParamMouthOpenY", "ParamMouthForm", "ParamMouthOpenX", "ParamMouthScaleY", "ParamMouthScaleX", "ParamMouthWidth", "ParamMouthHeight"];
        if (mouthCount++ < 1) {
          for (const name of mouthParams) {
            try {
              const v = core.getParameterValueById(name);
              console.log("[Mouth] " + name + "=" + v.toFixed(3));
            } catch (e) {
              console.log("[Mouth] " + name + ": NOT FOUND");
            }
          }
        }
      } catch (e) { if (mouthCount++ < 5) console.log("[Mouth] error:", e); }
    };
    ticker.add(forceMouth);
    return () => {
      ticker.remove(forceMouth);
    };
  }, [emotion, modelReady]);

  // Eye tracking
  useEffect(() => {
    const m = modelRef.current;
    if (!m) return;
    try {
      const eyeX = -(mousePos.x - 0.5) * 12;
      const eyeY = (mousePos.y - 0.5) * 12;

      const core = m.internalModel?.coreModel;
      if (core && typeof core.setParameterValueById === "function") {
        core.setParameterValueById("ParamEyeBallX", eyeX);
        core.setParameterValueById("ParamEyeBallY", eyeY);
        const angleX = -(mousePos.x - 0.5) * 10;
        const angleY = (mousePos.y - 0.5) * 6;
        core.setParameterValueById("ParamAngleX", angleX);
        core.setParameterValueById("ParamAngleY", angleY);
      }
    } catch {}
  }, [mousePos]);

  return (
    <div ref={divRef} style={{ width: "100%", height: "100%", overflow: "hidden" }} />
  );
}


