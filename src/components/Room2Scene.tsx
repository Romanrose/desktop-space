import { Application, BaseTexture, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OmegaEmotion, OmegaState } from "../types";
import { ALL_RECIPES } from "../systems/crafting";

type Props = {
  emotion: OmegaEmotion;
  equippedDecorations: Record<string, string>;
  onBackToMainRoom: () => void;
  lowMood?: boolean;
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
};

type Position = { x: number; y: number };

const DECO_COLORS: Record<string, number> = {
  vase: 0xffeedd,
  wall_lamp: 0xffdd88,
  small_table: 0xccaa88,
  window: 0x88ccff,
  planet_model: 0x88aaff,
  plant: 0x66dd88,
  bean_bag: 0xee8844,
  wardrobe: 0xaa8866,
  record_player: 0x886644,
};

const DECO_LABELS: Record<string, string> = {
  vase: "\u74F6",
  wall_lamp: "\u706F",
  small_table: "\u51E0",
  window: "\u7A97",
  planet_model: "\u661F",
  plant: "\u690D",
  bean_bag: "\u6C99",
  wardrobe: "\u8863",
  record_player: "\u5531",
};

export default function Room2Scene({
  emotion,
  equippedDecorations,
  onBackToMainRoom,
  lowMood,
  state,
  updateState,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const playerRef = useRef<Container | null>(null);
  const decorRef = useRef<Container | null>(null);
  const positionRef = useRef<Position>({ x: 512, y: 400 });
  const keysRef = useRef(new Set<string>());
  const [nearDoor, setNearDoor] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [selectedDeco, setSelectedDeco] = useState<string | null>(null);
  const [furniture, setFurniture] = useState<Record<string, Position>>(
    state.room2Furniture ?? {}
  );
  const placingPos = useRef<Position>({ x: 400, y: 300 });
  const placingId = useRef<string | null>(null);
  const furnitureRef = useRef(furniture);
  furnitureRef.current = furniture;

  // Owned room2 decor items from crafting
  const ownedDecoItems = ALL_RECIPES.filter(
    (r) =>
      r.category === "room2_decor" &&
      (state.purchasedItems ?? []).includes(r.id)
  );

  const saveFurniture = useCallback(
    async (newFurniture: Record<string, Position>) => {
      setFurniture(newFurniture);
      await updateState({ room2Furniture: newFurniture });
    },
    [updateState]
  );

  useEffect(() => {
    let disposed = false;
    const host = hostRef.current!;
    if (!host) return;

    function keyDown(event: KeyboardEvent) {
      keysRef.current.add(event.key.toLowerCase());
      if (event.key === "Escape") {
        setPlacing(false);
        setSelectedDeco(null);
      }
    }
    function keyUp(event: KeyboardEvent) {
      keysRef.current.delete(event.key.toLowerCase());
    }
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    async function init() {
      const app = new Application({
        width: host.clientWidth,
        height: host.clientHeight,
        transparent: true,
        antialias: true,
      });
      if (disposed) {
        app.destroy(true);
        return;
      }
      appRef.current = app;
      host.appendChild(app.view as unknown as Node);

      // Background
      const bg = new Graphics();
      bg.beginFill(0x080e14);
      bg.drawRect(0, 0, app.screen.width, app.screen.height);
      bg.endFill();
      app.stage.addChild(bg);

      // Floor
      const floor = new Graphics();
      const wallBottom = app.screen.height * 0.5;
      floor.beginFill(0x0f1a24);
      floor.drawRect(0, wallBottom, app.screen.width, app.screen.height - wallBottom);
      floor.endFill();
      floor.lineStyle(1, 0x1a2a3a, 0.2);
      for (let y = wallBottom; y < app.screen.height; y += 40) {
        floor.moveTo(0, y);
        floor.lineTo(app.screen.width, y);
      }
      for (let x = 0; x < app.screen.width; x += 60) {
        floor.moveTo(x, wallBottom);
        floor.lineTo(x, app.screen.height);
      }
      floor.lineStyle(0);
      app.stage.addChild(floor);

      // Walls
      const walls = new Graphics();
      walls.beginFill(0x121e2a);
      walls.drawRect(0, 60, app.screen.width, app.screen.height * 0.5 - 60);
      walls.endFill();
      walls.lineStyle(1, 0x1a2a3a, 0.15);
      for (let y = 60; y < app.screen.height * 0.5; y += 50) {
        walls.moveTo(0, y);
        walls.lineTo(app.screen.width, y);
      }
      walls.lineStyle(0);
      app.stage.addChild(walls);

      // Window with stars
      const win = new Graphics();
      const winX = app.screen.width * 0.65;
      const winY = app.screen.height * 0.15;
      win.beginFill(0x0a1720);
      win.drawRect(winX, winY, 120, 80);
      win.endFill();
      win.lineStyle(2, 0x1a3a4a);
      win.drawRect(winX, winY, 120, 80);
      win.lineStyle(0);
      win.beginFill(0xffffff, 0.6);
      win.drawCircle(winX + 30, winY + 20, 1.5);
      win.drawCircle(winX + 80, winY + 40, 1);
      win.drawCircle(winX + 50, winY + 50, 1.2);
      win.endFill();
      app.stage.addChild(win);

      // Door
      const doorG = new Graphics();
      doorG.beginFill(0x1a2a3a);
      doorG.drawRect(40, app.screen.height * 0.5 - 80, 50, 90);
      doorG.endFill();
      doorG.lineStyle(2, 0x2a4a5a);
      doorG.drawRect(40, app.screen.height * 0.5 - 80, 50, 90);
      doorG.lineStyle(0);
      doorG.beginFill(0x00ccff, 0.3);
      doorG.drawCircle(78, app.screen.height * 0.5 - 40, 3);
      doorG.endFill();
      app.stage.addChild(doorG);

      // Furniture layer
      const decorLayer = new Container();
      decorRef.current = decorLayer;
      app.stage.addChild(decorLayer);
      renderFurniture(decorLayer, app.screen.width, app.screen.height, furnitureRef.current);

      // Omega player
      let omegaTexture: Texture | undefined;
      try {
        omegaTexture = await loadImageAsTexture(
          app.renderer as any,
          "/live2d/omega-transparent.png"
        );
      } catch {
        /* fallback */
      }
      const player = drawOmegaFallback(emotion, omegaTexture);
      player.position.set(positionRef.current.x, positionRef.current.y);
      playerRef.current = player;
      app.stage.addChild(player);

      // Placing preview (follows placingPos)
      const preview = new Container();
      app.stage.addChild(preview);

      const handleResize = () =>
        app.renderer.resize(host.clientWidth, host.clientHeight);
      window.addEventListener("resize", handleResize);

      app.ticker.add((dt: number) => {
        const speed = 3.1 * dt;

        if (placing && placingId.current) {
          // Move the placing preview
          const p = placingPos.current;
          if (keysRef.current.has("w")) {
            p.y -= speed * 0.8;
            // perspective: moving up = smaller
          }
          if (keysRef.current.has("s")) {
            p.y += speed * 0.8;
          }
          if (keysRef.current.has("a")) p.x -= speed;
          if (keysRef.current.has("d")) p.x += speed;
          p.x = Math.max(40, Math.min(app.screen.width - 40, p.x));
          p.y = Math.max(120, Math.min(app.screen.height - 40, p.y));

          // Update preview
          preview.removeChildren();
          const itemId = placingId.current;
          const color = DECO_COLORS[itemId] ?? 0x00ccff;
          const label = DECO_LABELS[itemId] ?? "\u56FE";
          const previewG = new Graphics();
          previewG.beginFill(color, 0.3);
          previewG.drawRoundedRect(0, 0, 36, 36, 6);
          previewG.endFill();
          previewG.lineStyle(2, color, 0.6);
          previewG.drawRoundedRect(0, 0, 36, 36, 6);
          previewG.lineStyle(0);
          preview.addChild(previewG);
          const previewText = new Text(label, {
            fill: color,
            fontSize: 16,
            fontWeight: "700",
          });
          previewText.anchor.set(0.5);
          previewText.position.set(18, 18);
          preview.addChild(previewText);
          preview.position.set(p.x - 18, p.y - 18);
        } else {
          preview.removeChildren();
          // Normal player movement
          const pos = positionRef.current;
          if (keysRef.current.has("w")) pos.y -= speed * 0.8;
          if (keysRef.current.has("s")) pos.y += speed * 0.8;
          if (keysRef.current.has("a")) pos.x -= speed;
          if (keysRef.current.has("d")) pos.x += speed;
          pos.x = Math.max(60, Math.min(app.screen.width - 60, pos.x));
          pos.y = Math.max(200, Math.min(app.screen.height - 60, pos.y));
          player.position.set(pos.x, pos.y);
          player.scale.set(0.6 + (pos.y - 200) / 800);

          // Door proximity
          const doorDist = Math.hypot(pos.x - 80, pos.y - app.screen.height * 0.34);
          setNearDoor(doorDist < 120);
        }
      });
    }

    void init();
    return () => {
      disposed = true;
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      appRef.current?.destroy(true);
      appRef.current = null;
      if (host) host.replaceChildren();
    };
  }, [emotion, equippedDecorations, placing]);

  // Render furniture when it changes
  useEffect(() => {
    if (decorRef.current && appRef.current) {
      decorRef.current.removeChildren();
      renderFurniture(
        decorRef.current,
        appRef.current.screen.width,
        appRef.current.screen.height,
        furniture
      );
    }
  }, [furniture]);

  function startPlacing(itemId: string) {
    placingId.current = itemId;
    setSelectedDeco(itemId);
    setPlacing(true);
    // Start at center-ish
    placingPos.current = { x: 400, y: 300 };
  }

  function confirmPlace() {
    if (!placingId.current) return;
    const id = placingId.current;
    const pos = { ...placingPos.current };

    // Simple collision check
    const currentFurniture = furnitureRef.current;
    const collision = Object.entries(currentFurniture).some(
      ([existingId, existingPos]) =>
        existingId !== id &&
        Math.abs(existingPos.x - pos.x) < 50 &&
        Math.abs(existingPos.y - pos.y) < 50
    );

    if (collision) {
      return; // Can't place overlapping
    }

    const updated = { ...currentFurniture, [id]: pos };
    void saveFurniture(updated);
    setPlacing(false);
    setSelectedDeco(null);
    placingId.current = null;
  }

  function removeFurniture(itemId: string) {
    const updated = { ...furnitureRef.current };
    delete updated[itemId];
    void saveFurniture(updated);
  }

  return (
    <section className="scene-wrap">
      <div ref={hostRef} className="pixi-host" />

      {/* Door back button */}
      {!placing && nearDoor && (
        <button
          className="desk-action"
          type="button"
          onClick={onBackToMainRoom}
        >
          {'\u8FD4\u56DE\u4E3B\u8231'}
        </button>
      )}

      {/* Placement mode header */}
      <section className="room2-toolbar">
        <button
          type="button"
          className={`room2-btn ${placing ? "room2-btn--active" : ""}`}
          onClick={() => {
            if (placing) {
              setPlacing(false);
              setSelectedDeco(null);
              placingId.current = null;
            } else {
              setPlacing(true);
            }
          }}
        >
          {placing ? "\u9000\u51FA\u6446\u653E" : "\u6446\u653E\u5BB6\u5177"}
        </button>
        {placing && selectedDeco && (
          <button
            type="button"
            className="room2-btn room2-btn--confirm"
            onClick={confirmPlace}
          >
            \u786E\u8BA4\u653E\u7F6E (Enter)
          </button>
        )}
      </section>

      {/* Item palette */}
      {placing && !selectedDeco && (
        <section className="room2-palette">
          <p className="room2-palette__hint">\u9009\u62E9\u8981\u6446\u653E\u7684\u7269\u54C1\uFF1A</p>
          <div className="room2-palette__items">
            {ownedDecoItems.length === 0 ? (
              <p className="room2-palette__empty">
                (\u8FD8\u6CA1\u6709\u53EF\u653E\u7F6E\u7684\u7269\u54C1\uFF0C\u5148\u53BB\u5408\u6210\u673A\u5236\u9020\u5427)
              </p>
            ) : (
              ownedDecoItems.map((item) => {
                const placed = furniture[item.id] != null;
                const color = DECO_COLORS[item.id] ?? 0x00ccff;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`room2-palette__item ${placed ? "room2-palette__item--placed" : ""}`}
                    onClick={() => {
                      if (placed) {
                        removeFurniture(item.id);
                      } else {
                        startPlacing(item.id);
                      }
                    }}
                  >
                    <span
                      className="room2-palette__swatch"
                      style={{ backgroundColor: `#${color.toString(16).padStart(6, "0")}` }}
                    >
                      {DECO_LABELS[item.id] ?? "\u56FE"}
                    </span>
                    <span className="room2-palette__name">{item.name}</span>
                    {placed && <span className="room2-palette__badge">\u5DF2\u653E\u7F6E</span>}
                  </button>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* Placement hint */}
      {placing && selectedDeco && (
        <p className="room2-placement-hint">
          WASD \u79FB\u52A8\u7269\u54C1\uFF0CEnter \u786E\u8BA4\u653E\u7F6E\uFF0CEsc \u53D6\u6D88
        </p>
      )}

      {!placing && <p className="room2-label">{'\u6269\u5EFA\u7A7A\u95F4'}</p>}
    </section>
  );
}

function renderFurniture(
  layer: Container,
  width: number,
  height: number,
  furniture: Record<string, Position>
) {
  for (const [id, pos] of Object.entries(furniture)) {
    const color = DECO_COLORS[id] ?? 0x00ccff;
    const label = DECO_LABELS[id] ?? "\u56FE";

    // Perspective scaling: items higher up = smaller
    const scaleFactor = 0.5 + ((pos.y - 120) / (height - 160)) * 0.5;
    const itemSize = Math.round(32 * scaleFactor);

    const g = new Graphics();
    g.beginFill(color, 0.25);
    g.drawRoundedRect(0, 0, itemSize, itemSize, 6);
    g.endFill();
    g.lineStyle(1.5, color, 0.4);
    g.drawRoundedRect(0, 0, itemSize, itemSize, 6);
    g.lineStyle(0);

    const t = new Text(label, {
      fill: color,
      fontSize: Math.round(itemSize * 0.45),
      fontWeight: "700",
    });
    t.anchor.set(0.5);
    t.position.set(itemSize / 2, itemSize / 2);

    const container = new Container();
    container.addChild(g);
    container.addChild(t);
    container.position.set(pos.x - itemSize / 2, pos.y - itemSize / 2);
    container.scale.set(scaleFactor);
    layer.addChild(container);
  }
}

function loadImageAsTexture(_renderer: any, url: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const base = new BaseTexture(img);
      resolve(new Texture(base));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function drawOmegaFallback(emotion: OmegaEmotion, texture?: Texture) {
  const root = new Container();
  if (texture) {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    sprite.width = 100;
    sprite.height = 168;
    sprite.y = 100;
    root.addChild(sprite);
  } else {
    const body = new Graphics();
    body.beginFill(0xfffaf0);
    body.drawRoundedRect(-26, 22, 52, 78, 20);
    body.endFill();
    body.lineStyle(2, 0x19c8b9);
    body.drawRoundedRect(-26, 22, 52, 78, 20);
    body.lineStyle(0);
    root.addChild(body);
    const head = new Graphics();
    head.beginFill(0xfffdf4);
    head.drawCircle(0, 0, 32);
    head.endFill();
    head.lineStyle(2, 0xdfd4be);
    head.drawCircle(0, 0, 32);
    head.lineStyle(0);
    root.addChild(head);
  }
  const glow = new Graphics();
  glow.beginFill(0x19c8b9, 0.15);
  glow.drawEllipse(0, 92, 38, 8);
  glow.endFill();
  root.addChild(glow);
  return root;
}

