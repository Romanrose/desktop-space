import type { OmegaEmotion } from "../types";

interface Live2DModelProps {
  modelPath?: string;
  scale?: number;
  emotion?: OmegaEmotion;
  mousePos?: { x: number; y: number };
  onClick?: () => void;
}

const emotionFilters: Partial<Record<OmegaEmotion, string>> = {
  happy: "drop-shadow(0 24px 22px rgba(93, 64, 55, 0.22)) saturate(1.08) brightness(1.04)",
  excited: "drop-shadow(0 24px 22px rgba(93, 64, 55, 0.22)) saturate(1.12) brightness(1.06)",
  sad: "drop-shadow(0 24px 22px rgba(93, 64, 55, 0.22)) saturate(0.88) brightness(0.94)",
  fearful: "drop-shadow(0 24px 22px rgba(93, 64, 55, 0.22)) saturate(0.86) brightness(0.96)",
};

export default function Live2DModel({
  scale = 1,
  emotion = "calm_negative",
  mousePos = { x: 0.5, y: 0.5 },
  onClick,
}: Live2DModelProps) {
  const lookX = (mousePos.x - 0.5) * 10;
  const lookY = (mousePos.y - 0.5) * 8;
  const filter =
    emotionFilters[emotion] ?? "drop-shadow(0 24px 22px rgba(93, 64, 55, 0.22))";

  return (
    <button
      type="button"
      className="live2d-fallback-button"
      onClick={onClick}
      aria-label="Omega"
      style={{
        width: "100%",
        height: "100%",
        padding: 0,
        border: 0,
        background: "transparent",
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      <img
        src="/live2d/omega-transparent.png"
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          pointerEvents: "none",
          filter,
          transform: `translate(${lookX}px, ${lookY}px) scale(${scale})`,
          transition: "transform 220ms ease, filter 220ms ease",
        }}
      />
    </button>
  );
}
