import { Application, Assets, Container, Graphics, Sprite, Text, Texture, Ticker } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import type { OmegaEmotion } from "../types";

type Props = {
  prologueDone: boolean;
  emotion: OmegaEmotion;
  onDeskInteract?: () => void;
  onBedInteract?: () => void;
  lowMood?: boolean;
  room2Unlocked?: boolean;
  onShelfInteract?: () => void;
  onRoom2Door?: () => void;
  mood: number;
  equippedDecorations?: Record<string, string>;
  capsuleBackgroundDirty?: boolean;
};

type Position = { x: number; y: number };

export function CapsuleScene({
  prologueDone,
  emotion,
  onDeskInteract,
  onBedInteract,
  lowMood,
  room2Unlocked,
  onShelfInteract,
  onRoom2Door,
  mood,
  equippedDecorations = {},
  capsuleBackgroundDirty = true,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const playerRef = useRef<Container | null>(null);
  const positionRef = useRef<Position>({ x: 512, y: 444 });
  const keysRef = useRef(new Set<string>());
  const [nearDesk, setNearDesk] = useState(false);
  const [nearBed, setNearBed] = useState(false);
  const [nearShelf, setNearShelf] = useState(false);
  const [nearDoor, setNearDoor] = useState(false);
  const arrowRef = useRef<Text | null>(null);
  const bedArrowRef = useRef<Text | null>(null);
  const shelfArrowRef = useRef<Text | null>(null);
  const doorArrowRef = useRef<Text | null>(null);

  useEffect(() => {
    let disposed = false;
    if (!hostRef.current) return;
    const hostElement: HTMLDivElement = hostRef.current;

    function keyDown(event: KeyboardEvent) {
      keysRef.current.add(event.key.toLowerCase());
    }

    function keyUp(event: KeyboardEvent) {
      keysRef.current.delete(event.key.toLowerCase());
    }

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    async function init() {
      const app = new Application();
      await app.init({
        width: hostElement.clientWidth,
        height: hostElement.clientHeight,
        backgroundAlpha: 0,
        antialias: true,
        resizeTo: hostElement,
      });

      if (disposed) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
      hostElement.appendChild(app.canvas);

      // --- Background image layer ---
      try {
        const capsuleBgTexture = await loadImageAsTexture(
          app.renderer as unknown as import("pixi.js").Renderer,
          "/capusle/capsule-bg.png"
        );
        const bgSprite = new Sprite(capsuleBgTexture);
        bgSprite.width = app.screen.width;
        bgSprite.height = app.screen.height;
        app.stage.addChildAt(bgSprite, 0);
      } catch (err) {
        console.warn("Capsule background load failed, using fallback", err);
        const fallback = new Graphics();
        fallback.beginFill(0x0a1219);
        fallback.drawRect(0, 0, app.screen.width, app.screen.height);
        fallback.endFill();
        app.stage.addChildAt(fallback, 0);
      }

      // --- Decoration overlays ---
      const decorLayer = new Container();
      app.stage.addChild(decorLayer);
      drawDecorationOverlay(decorLayer, app.screen.width, app.screen.height, equippedDecorations, capsuleBackgroundDirty);

      // --- UI overlay (text + door indicator) ---
      const overlay = new Container();
      app.stage.addChild(overlay);
      drawUIOverlay(overlay, app.screen.width, app.screen.height, mood, room2Unlocked ?? false);

      // --- Omega character ---
      let omegaTexture: Texture | undefined;
      try {
        omegaTexture = await loadImageAsTexture(
          app.renderer as unknown as import("pixi.js").Renderer,
          "/live2d/omega-transparent.png"
        );
      } catch (err) {
        console.warn("Omega image load failed, using fallback draw", err);
      }

      const player = drawOmega(emotion, omegaTexture);
      player.position.set(positionRef.current.x, positionRef.current.y);
      player.visible = true;
      playerRef.current = player;
      app.stage.addChild(player);

      // --- Interaction arrows ---
      const arrow = new Text("\u25BC", {
        fill: 0x00ccff,
        fontSize: 46,
        fontWeight: "700",
      });
      arrow.anchor.set(0.5);
      arrow.position.set(app.screen.width * 0.5, app.screen.height * 0.34);
      arrow.alpha = prologueDone ? 0 : 0.9;
      arrowRef.current = arrow;
      app.stage.addChild(arrow);

      const bedArrow = new Text("\u25BC Rest here", {
        fill: 0xff6666,
        fontSize: 28,
        fontWeight: "700",
      });
      bedArrow.anchor.set(0.5);
      bedArrow.position.set(app.screen.width - 140, app.screen.height * 0.44);
      bedArrow.alpha = lowMood ? 0.9 : 0;
      bedArrowRef.current = bedArrow;
      app.stage.addChild(bedArrow);

      const shelfArrow = new Text("\u25C0", {
        fill: 0x88ccff,
        fontSize: 36,
        fontWeight: "700",
      });
      shelfArrow.anchor.set(0.5);
      shelfArrow.position.set(120, app.screen.height * 0.42);
      shelfArrow.alpha = room2Unlocked ? 0.15 : 0;
      shelfArrowRef.current = shelfArrow;
      app.stage.addChild(shelfArrow);

      const doorArrow = new Text("\u25B6", {
        fill: 0x88ccff,
        fontSize: 36,
        fontWeight: "700",
      });
      doorArrow.anchor.set(0.5);
      doorArrow.position.set(60, app.screen.height * 0.72);
      doorArrow.alpha = room2Unlocked ? 0.12 : 0;
      doorArrowRef.current = doorArrow;
      app.stage.addChild(doorArrow);

      const handleResize = () => {
        app.renderer.resize(hostElement.clientWidth, hostElement.clientHeight);
      };
      window.addEventListener("resize", handleResize);

      // --- Tick loop ---
      app.ticker.add((ticker: Ticker) => {
        const speed = 3.1 * ticker.deltaTime;
        const pos = positionRef.current;
        if (keysRef.current.has("w")) pos.y -= speed;
        if (keysRef.current.has("s")) pos.y += speed;
        if (keysRef.current.has("a")) pos.x -= speed;
        if (keysRef.current.has("d")) pos.x += speed;
        pos.x = Math.max(150, Math.min(app.screen.width - 150, pos.x));
        pos.y = Math.max(300, Math.min(app.screen.height - 120, pos.y));
        player.position.set(pos.x, pos.y);
        player.scale.set(0.72 + (pos.y - 300) / 900);

        if (arrowRef.current) {
          arrowRef.current.alpha = prologueDone ? 0 : 0.5 + Math.sin(performance.now() / 260) * 0.4;
        }
        if (bedArrowRef.current) {
          bedArrowRef.current.alpha = lowMood ? 0.5 + Math.sin(performance.now() / 320) * 0.4 : 0;
        }

        const deskCenterX = app.screen.width * 0.5;
        const deskCenterY = app.screen.height * 0.56;
        setNearDesk(Math.hypot(pos.x - deskCenterX, pos.y - deskCenterY) < 170 && !prologueDone);

        const bedCenterX = app.screen.width - 160;
        const bedCenterY = app.screen.height * 0.6;
        setNearBed(Math.hypot(pos.x - bedCenterX, pos.y - bedCenterY) < 150 && lowMood === true);

        const shelfCenterX = 120;
        const shelfCenterY = app.screen.height * 0.42;
        const isNearShelf = Math.hypot(pos.x - shelfCenterX, pos.y - shelfCenterY) < 160 && room2Unlocked === true;
        setNearShelf(isNearShelf);

        const doorCenterX = 60;
        const doorCenterY = app.screen.height * 0.72;
        const isNearDoor = Math.hypot(pos.x - doorCenterX, pos.y - doorCenterY) < 140 && room2Unlocked === true;
        setNearDoor(isNearDoor);

        if (shelfArrowRef.current) {
          shelfArrowRef.current.alpha = isNearShelf
            ? 0.5 + Math.sin(performance.now() / 280) * 0.4
            : room2Unlocked ? 0.15 : 0;
        }
        if (doorArrowRef.current) {
          doorArrowRef.current.alpha = isNearDoor
            ? 0.5 + Math.sin(performance.now() / 300) * 0.4
            : room2Unlocked ? 0.12 : 0;
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
      hostElement.replaceChildren();
    };
  }, [emotion, prologueDone, lowMood, mood, room2Unlocked, equippedDecorations, capsuleBackgroundDirty]);

  return (
    <section className="scene-wrap">
      <div ref={hostRef} className="pixi-host" />
      {nearDesk && onDeskInteract && (
        <button className="desk-action" type="button" onClick={onDeskInteract}>
          Click Desk
        </button>
      )}
      {nearBed && onBedInteract && (
        <button className="desk-action" type="button" onClick={onBedInteract}>
          Rest (60s)
        </button>
      )}
      {nearShelf && onShelfInteract && (
        <button className="desk-action" type="button" onClick={onShelfInteract}>
          View Bookshelf
        </button>
      )}
      {nearDoor && onRoom2Door && (
        <button className="desk-action" type="button" onClick={onRoom2Door}>
          Go to Expansion
        </button>
      )}
    </section>
  );
}

/** Load an image file and convert it to a PixiJS Texture. */
function loadImageAsTexture(
  _renderer: import("pixi.js").Renderer,
  url: string
): Promise<Texture> {
  return Assets.load<Texture>(url);
}

/** Draw subtle decoration overlays based on equipped items. */
function drawDecorationOverlay(
  stage: Container,
  width: number,
  height: number,
  equipped: Record<string, string>,
  dirty: boolean,
) {
  const cx = width * 0.5;
  const wallTop = height * 0.08;
  const wallBottom = height * 0.64;
  const deskY = height * 0.56;

  // Dirty capsule: subtle dark vignette overlay
  if (dirty) {
    const vignette = new Graphics();
    vignette.beginFill(0x000000, 0.08);
    vignette.drawRect(0, 0, width, height);
    vignette.endFill();
    stage.addChild(vignette);
  }

  // Equipped wallpaper: subtle colored wall border glow
  if (equipped.wallpaper || equipped.capsule_wallpaper) {
    const wallGlow = new Graphics();
    wallGlow.lineStyle(4, 0x88ccff, 0.15);
    wallGlow.drawPolygon([
      82, wallTop,
      width - 82, wallTop,
      width - 18, 135,
      width - 78, wallBottom,
      78, wallBottom,
      18, 135,
    ]);
    wallGlow.lineStyle(0);
    stage.addChild(wallGlow);
  }

  // Equipped floor: subtle floor accent
  if (equipped.floor || equipped.capsule_floor) {
    const floorAccent = new Graphics();
    floorAccent.beginFill(0x88ccff, 0.04);
    floorAccent.drawPolygon([
      78, wallBottom,
      width - 78, wallBottom,
      width - 168, height - 28,
      168, height - 28,
    ]);
    floorAccent.endFill();
    floorAccent.lineStyle(2, 0x88ccff, 0.12);
    floorAccent.moveTo(78, wallBottom);
    floorAccent.lineTo(width - 78, wallBottom);
    floorAccent.lineStyle(0);
    stage.addChild(floorAccent);
  }

  // Equipped desk ornament: small glowing dot on desk
  if (equipped.desk_ornament || equipped.capsule_desk_ornament) {
    const ornament = new Graphics();
    ornament.beginFill(0x88ddff, 0.25);
    ornament.drawCircle(cx + 100, deskY - 18, 10);
    ornament.endFill();
    ornament.lineStyle(1.5, 0x88ddff, 0.3);
    ornament.drawCircle(cx + 100, deskY - 18, 10);
    ornament.lineStyle(0);
    stage.addChild(ornament);
  }

  // Equipped window decoration: subtle light glow
  if (equipped.window || equipped.capsule_window) {
    const windowDecor = new Graphics();
    windowDecor.beginFill(0x00ccff, 0.06);
    windowDecor.drawCircle(cx + 180, deskY - 70, 16);
    windowDecor.endFill();
    windowDecor.lineStyle(1, 0x00ccff, 0.15);
    windowDecor.drawCircle(cx + 180, deskY - 70, 16);
    windowDecor.lineStyle(0);
    stage.addChild(windowDecor);
  }

  // Equipped desk: subtle desk edge highlight
  if (equipped.desk || equipped.capsule_desk) {
    const deskHighlight = new Graphics();
    deskHighlight.lineStyle(2, 0x88ccff, 0.12);
    deskHighlight.drawRoundedRect(cx - 160, deskY, 320, 42, 6);
    deskHighlight.lineStyle(0);
    stage.addChild(deskHighlight);
  }
}

/** Minimal UI overlay: mood/todo text + door indicator. */
function drawUIOverlay(
  stage: Container,
  width: number,
  height: number,
  moodValue: number,
  room2Unlocked: boolean,
) {
  const cyan = 0x00ccff;
  const container = new Container();

  const moodTitle = new Text("\u5FC3\u5883\u503C", {
    fill: cyan,
    fontSize: 14,
    fontWeight: "700",
  });
  moodTitle.anchor.set(0.5);
  moodTitle.position.set(247, height * 0.335);
  container.addChild(moodTitle);

  const moodText = new Text(String(moodValue), {
    fill: cyan,
    fontSize: 30,
    fontWeight: "800",
  });
  moodText.anchor.set(0.5);
  moodText.position.set(247, height * 0.385);
  container.addChild(moodText);

  const todo = new Text(
    "\u4ECA\u65E5\u8BA1\u5212\n\u2606 \u9002\u5E94\u65B0\u73AF\u5883\n\u2606 \u6574\u7406\u4E66\u67B6\n\u2606 \u63A2\u7D22\u8231\u5916",
    { fill: cyan, fontSize: 13, fontWeight: "700", lineHeight: 21 }
  );
  todo.position.set(width - 278, height * 0.322);
  container.addChild(todo);

  stage.addChild(container);

  if (room2Unlocked) {
    const door = new Graphics();
    const doorX = 18;
    const doorY = height * 0.68;
    const doorW = 76;
    const doorH = 108;

    door.lineStyle(1.5, 0x00ccff, 0.25);
    door.drawRoundedRect(doorX, doorY, doorW, doorH, 6);
    door.lineStyle(0);

    const glow = new Graphics();
    glow.beginFill(0x00ccff, 0.06);
    glow.drawRoundedRect(doorX - 3, doorY - 3, doorW + 6, doorH + 6, 8);
    glow.endFill();

    stage.addChild(glow);
    stage.addChild(door);
  }
}

function drawOmega(emotion: OmegaEmotion, texture?: Texture) {
  const root = new Container();
  if (texture) {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    sprite.width = 118;
    sprite.height = 198;
    sprite.y = 118;
    root.addChild(sprite);
  } else {
    const body = new Graphics();
    body.beginFill(0xfffaf0);
    body.drawRoundedRect(-30, 26, 60, 92, 24);
    body.endFill();
    body.lineStyle(2, 0x19c8b9);
    body.drawRoundedRect(-30, 26, 60, 92, 24);
    body.lineStyle(0);
    root.addChild(body);

    const head = new Graphics();
    head.beginFill(0xfffdf4);
    head.drawCircle(0, 0, 38);
    head.drawPolygon([-36, -10, -20, -48, 18, -42, 36, -8, 24, -28, -4, -36]);
    head.endFill();
    head.lineStyle(2, 0xdfd4be);
    head.drawCircle(0, 0, 38);
    head.lineStyle(0);
    root.addChild(head);
  }

  const moodGlow = new Graphics();
  const glowColor = emotion === "sad" || emotion === "calm_negative" ? 0x9a835a : 0x19c8b9;
  moodGlow.beginFill(glowColor, 0.2);
  moodGlow.drawEllipse(0, 108, 44, 10);
  moodGlow.endFill();
  root.addChild(moodGlow);

  if (!texture) {
    const face = new Graphics();
    const eyeColor = emotion === "sad" || emotion === "calm_negative" ? 0x9a835a : 0x5d4037;

    face.beginFill(eyeColor);
    face.drawRoundedRect(-20, -8, 10, 4, 2);
    face.drawRoundedRect(10, -8, 10, 4, 2);
    face.endFill();

    if (emotion === "happy" || emotion === "proud") {
      face.lineStyle(2, 0x5d4037);
      face.arc(0, 8, 12, 0, Math.PI);
      face.lineStyle(0);
    } else if (emotion === "sad") {
      face.lineStyle(2, 0x9a835a);
      face.arc(0, 18, 10, Math.PI, Math.PI * 2);
      face.lineStyle(0);
    } else {
      face.lineStyle(2, 0x5d4037);
      face.moveTo(-9, 13);
      face.lineTo(9, 13);
      face.lineStyle(0);
    }
    root.addChild(face);
  }

  return root;
}
