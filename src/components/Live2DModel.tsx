import { useCallback, useEffect, useRef } from "react";
import {
  Live2DCanvas,
  Live2DModel as ReactLive2DModel,
  Live2DRunner,
  useLive2DCanvasContext,
  useLive2DModelContext,
  useTicker,
} from "@greenmansk/react-live2d";
import type { OmegaEmotion } from "../types";

interface Live2DModelProps {
  modelPath: string;
  scale: number;
  emotion: OmegaEmotion;
  mousePos: { x: number; y: number };
  onClick: () => void;
}

/**
 * Keeps the <canvas> element's pixel dimensions in sync with its CSS display size.
 * Without this the WebGL viewport would default to 0 and nothing renders.
 */
function CanvasProvider() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { setCanvas } = useLive2DCanvasContext();

  const syncSize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const dpr = window.devicePixelRatio || 1;
    const displayW = el.clientWidth;
    const displayH = el.clientHeight;
    if (displayW === 0 || displayH === 0) return;
    const needW = Math.round(displayW * dpr);
    const needH = Math.round(displayH * dpr);
    if (el.width !== needW || el.height !== needH) {
      el.width = needW;
      el.height = needH;
    }
  }, []);

  useEffect(() => {
    if (ref.current) {
      setCanvas(ref.current);
      syncSize();
    }
    const ro = new ResizeObserver(() => syncSize());
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [setCanvas, syncSize]);

  return (
    <canvas
      ref={ref}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}

/** Inner component that has access to the Live2D model context for controls. */
function ModelController({
  emotion,
  mousePos,
}: {
  emotion: OmegaEmotion;
  mousePos: { x: number; y: number };
}) {
  const ctx = useLive2DModelContext();
  const lastEmotionRef = useRef(emotion);

  // Eye tracking via mouse position
  useEffect(() => {
    if (!ctx?.motionManager) return;
    const nx = (mousePos.x - 0.5) * 2;
    const ny = (mousePos.y - 0.5) * 2;
    ctx.motionManager.setLookTargetRelative(-nx, -ny, 5);
  }, [mousePos, ctx]);

  // Emotion / expression changes
  useEffect(() => {
    if (!ctx?.motionManager || emotion === lastEmotionRef.current) return;
    lastEmotionRef.current = emotion;
    const expressions = ctx.motionManager.getExpressionsList();
    if (expressions.length > 0 && expressions.includes(emotion)) {
      ctx.motionManager.setExpression(emotion);
    }
  }, [emotion, ctx]);

  return null;
}

export default function Live2DModel({
  modelPath,
  scale,
  emotion,
  mousePos,
  onClick,
}: Live2DModelProps) {
  const ticker = useTicker();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        cursor: "pointer",
        overflow: "hidden",
      }}
      onClick={onClick}
    >
      <Live2DRunner ticker={ticker}>
        <Live2DCanvas>
          <CanvasProvider />
          <ReactLive2DModel
            modelJsonPath={modelPath}
            scale={scale}
            positionX={0}
            positionY={0}
            onError={(err) => console.error("Live2D model error:", err)}
          >
            <ModelController emotion={emotion} mousePos={mousePos} />
          </ReactLive2DModel>
        </Live2DCanvas>
      </Live2DRunner>
    </div>
  );
}
