import { Application, Assets, Container, Graphics, Sprite, Text } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import type { OmegaEmotion } from "../types";

type Props = {
  prologueDone: boolean;
  emotion: OmegaEmotion;
  onDeskInteract?: () => void;
};

type Position = { x: number; y: number };

export function CapsuleScene({ prologueDone, emotion, onDeskInteract }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const playerRef = useRef<Container | null>(null);
  const positionRef = useRef<Position>({ x: 512, y: 444 });
  const keysRef = useRef(new Set<string>());
  const [nearDesk, setNearDesk] = useState(false);

  useEffect(() => {
    let disposed = false;
    if (!hostRef.current) return;
    const hostElement: HTMLDivElement = hostRef.current;

    async function init() {
      const app = new Application();
      await app.init({
        width: hostElement.clientWidth,
        height: hostElement.clientHeight,
        background: "#d9d7dc",
        antialias: true,
        resizeTo: hostElement
      });
      if (disposed) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
      hostElement.appendChild(app.canvas);

      const room = new Container();
      app.stage.addChild(room);
      drawRoom(room, app.screen.width, app.screen.height);

      const player = await drawOmega(emotion);
      player.position.set(positionRef.current.x, positionRef.current.y);
      player.visible = false;
      playerRef.current = player;
      app.stage.addChild(player);

      const arrow = new Text({ text: "↓", style: { fill: "#8ff4e8", fontSize: 46, fontWeight: "700" } });
      arrow.anchor.set(0.5);
      arrow.position.set(app.screen.width * 0.5, app.screen.height * 0.34);
      arrow.alpha = prologueDone ? 0 : 1;
      app.stage.addChild(arrow);

      app.ticker.add((ticker) => {
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
        arrow.alpha = prologueDone ? 0 : 0.55 + Math.sin(performance.now() / 260) * 0.35;
        const distance = Math.hypot(pos.x - app.screen.width * 0.5, pos.y - app.screen.height * 0.56);
        setNearDesk(distance < 170);
      });
    }

    function keyDown(event: KeyboardEvent) {
      keysRef.current.add(event.key.toLowerCase());
    }

    function keyUp(event: KeyboardEvent) {
      keysRef.current.delete(event.key.toLowerCase());
    }

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    void init();

    return () => {
      disposed = true;
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      appRef.current?.destroy(true);
      appRef.current = null;
      hostElement.replaceChildren();
    };
  }, [emotion, prologueDone]);

  return (
    <section className="scene-wrap">
      <div ref={hostRef} className="pixi-host" />
      {nearDesk && onDeskInteract && (
        <button className="desk-action" type="button" onClick={onDeskInteract}>
          单击书桌
        </button>
      )}
    </section>
  );
}

function drawRoom(stage: Container, width: number, height: number) {
  const cx = width * 0.5;
  const wallTop = height * 0.08;
  const wallBottom = height * 0.64;
  const floorTop = wallBottom;
  const cyan = "#8ff4e8";
  const wall = "#dedde1";
  const panel = "#f3f1f3";
  const line = "#c4c0c7";
  const softLine = "#d8d4db";

  const background = new Graphics();
  background.rect(0, 0, width, height).fill("#cbc8cf");
  background.poly([
    82, wallTop,
    width - 82, wallTop,
    width - 18, 135,
    width - 78, wallBottom,
    78, wallBottom,
    18, 135
  ]).fill(wall).stroke({ color: "#efedf0", width: 8 });
  background.poly([78, floorTop, width - 78, floorTop, width - 168, height - 28, 168, height - 28]).fill("#d7d4d9");
  background.moveTo(78, floorTop).lineTo(width - 78, floorTop).stroke({ color: "#f3f1f3", width: 6 });
  background.moveTo(190, height - 28).lineTo(310, floorTop).stroke({ color: "#ece9ed", width: 2 });
  background.moveTo(width - 190, height - 28).lineTo(width - 310, floorTop).stroke({ color: "#ece9ed", width: 2 });
  background.rect(0, 0, width, height).stroke({ color: "#bbb7bf", width: 2 });
  stage.addChild(background);

  const ribs = new Graphics();
  ribs.moveTo(20, 136).lineTo(90, 60).lineTo(248, 60).lineTo(300, 88).stroke({ color: "#bfbac3", width: 3 });
  ribs.moveTo(width - 20, 136).lineTo(width - 90, 60).lineTo(width - 248, 60).lineTo(width - 300, 88).stroke({ color: "#bfbac3", width: 3 });
  ribs.moveTo(86, wallBottom).lineTo(136, 150).stroke({ color: softLine, width: 2 });
  ribs.moveTo(width - 86, wallBottom).lineTo(width - 136, 150).stroke({ color: softLine, width: 2 });
  stage.addChild(ribs);

  const windowFrame = new Graphics();
  const wx = cx - 210;
  const wy = height * 0.19;
  const ww = 420;
  const wh = 218;
  windowFrame.poly([
    wx + 36, wy,
    wx + ww - 36, wy,
    wx + ww, wy + 34,
    wx + ww, wy + wh - 34,
    wx + ww - 36, wy + wh,
    wx + 36, wy + wh,
    wx, wy + wh - 34,
    wx, wy + 34
  ]).fill("#ece9ed").stroke({ color: "#c7c3cb", width: 3 });
  windowFrame.poly([
    wx + 58, wy + 28,
    wx + ww - 58, wy + 28,
    wx + ww - 22, wy + 58,
    wx + ww - 22, wy + wh - 58,
    wx + ww - 58, wy + wh - 28,
    wx + 58, wy + wh - 28,
    wx + 22, wy + wh - 58,
    wx + 22, wy + 58
  ]).fill("#202a35");
  windowFrame.circle(wx + ww - 56, wy + 92, 76).fill("#c8f5ee");
  windowFrame.circle(wx + ww - 84, wy + 82, 108).fill({ color: "#9fe3da", alpha: 0.34 });
  for (const [sx, sy, sr] of [
    [wx + 88, wy + 62, 2],
    [wx + 116, wy + 92, 1.6],
    [wx + 166, wy + 54, 2],
    [wx + 236, wy + 118, 1.5],
    [wx + 286, wy + 74, 1.8]
  ]) {
    windowFrame.circle(sx, sy, sr).fill("#f8fbff");
  }
  stage.addChild(windowFrame);

  const shelf = new Graphics();
  shelf.roundRect(36, height * 0.22, 150, 338, 12).fill("#ece9ed").stroke({ color: "#c5c0c9", width: 3 });
  shelf.rect(52, height * 0.26, 118, 108).fill("#f7f5f7");
  shelf.rect(52, height * 0.46, 118, 72).fill("#f7f5f7");
  shelf.moveTo(52, height * 0.41).lineTo(170, height * 0.41).stroke({ color: "#cfcbd2", width: 3 });
  shelf.roundRect(52, height * 0.57, 118, 88, 8).fill("#ddd9df");
  shelf.rect(72, height * 0.28, 10, 78).fill("#ffffff");
  shelf.rect(86, height * 0.30, 13, 70).fill("#d7eeeb");
  shelf.rect(103, height * 0.27, 15, 84).fill("#f6f5f6");
  shelf.rect(122, height * 0.32, 16, 60).fill("#b8d7d2");
  shelf.roundRect(75, height * 0.49, 40, 56, 6).fill("#abc7c2");
  shelf.roundRect(118, height * 0.49, 18, 34, 5).fill("#edf7f5");
  shelf.moveTo(58, height * 0.61).lineTo(164, height * 0.61).stroke({ color: "#f2f0f3", width: 2 });
  shelf.moveTo(58, height * 0.65).lineTo(164, height * 0.65).stroke({ color: "#f2f0f3", width: 2 });
  stage.addChild(shelf);

  const bed = new Graphics();
  bed.roundRect(width - 264, height * 0.5, 210, 162, 18).fill("#d6d2d8").stroke({ color: "#c1bcc5", width: 3 });
  bed.roundRect(width - 246, height * 0.54, 178, 58, 18).fill("#f8f7f8");
  bed.roundRect(width - 246, height * 0.6, 178, 78, 12).fill("#ffffff");
  bed.roundRect(width - 248, height * 0.62, 180, 52, 8).fill("#b8e5df");
  bed.roundRect(width - 244, height * 0.52, 160, 32, 14).fill("#ffffff");
  stage.addChild(bed);

  const displays = new Graphics();
  displays.roundRect(208, height * 0.27, 78, 146, 8).fill(panel).stroke({ color: softLine, width: 3 });
  displays.roundRect(222, height * 0.305, 50, 86, 5).fill("#384049").stroke({ color: "#9ef5ea", width: 1 });
  displays.roundRect(width - 306, height * 0.27, 98, 156, 8).fill(panel).stroke({ color: softLine, width: 3 });
  displays.roundRect(width - 288, height * 0.305, 64, 98, 5).fill("#384049").stroke({ color: "#9ef5ea", width: 1 });
  stage.addChild(displays);

  const displayText = new Container();
  const moodTitle = new Text({ text: "心境值", style: { fill: cyan, fontSize: 14, fontWeight: "700" } });
  moodTitle.anchor.set(0.5);
  moodTitle.position.set(247, height * 0.335);
  displayText.addChild(moodTitle);
  const moodValue = new Text({ text: "29", style: { fill: cyan, fontSize: 30, fontWeight: "800" } });
  moodValue.anchor.set(0.5);
  moodValue.position.set(247, height * 0.385);
  displayText.addChild(moodValue);
  const todo = new Text({ text: "今日计划\n☑ 喝水\n☑ 读书\n☑ 合成\n☐ 散步", style: { fill: cyan, fontSize: 13, fontWeight: "700", lineHeight: 21 } });
  todo.position.set(width - 278, height * 0.322);
  displayText.addChild(todo);
  stage.addChild(displayText);

  const rug = new Graphics();
  rug.roundRect(cx - 170, height * 0.79, 340, 96, 12).fill("#ece9ed").stroke({ color: "#c7c2cb", width: 2 });
  rug.poly([cx - 32, height * 0.835, cx + 20, height * 0.825, cx + 42, height * 0.865, cx - 12, height * 0.875]).stroke({ color: "#bdb8c1", width: 5 });
  stage.addChild(rug);

  const desk = new Graphics();
  const deskY = height * 0.56;
  const seatedOmega = new Graphics();
  seatedOmega.ellipse(cx, deskY - 22, 72, 18).fill({ color: "#b8f5ec", alpha: 0.2 });
  seatedOmega.roundRect(cx - 32, deskY - 92, 64, 76, 24).fill("#f4f3f5").stroke({ color: "#a9a4ad", width: 2 });
  seatedOmega.circle(cx, deskY - 118, 46).fill("#f7f6f8").stroke({ color: "#a9a4ad", width: 2 });
  seatedOmega.poly([cx - 42, deskY - 128, cx - 16, deskY - 168, cx + 18, deskY - 162, cx + 44, deskY - 130, cx + 26, deskY - 146, cx - 8, deskY - 152]).fill("#e9e7eb").stroke({ color: "#a9a4ad", width: 2 });
  seatedOmega.roundRect(cx - 22, deskY - 120, 10, 5, 2).fill("#27313d");
  seatedOmega.roundRect(cx + 12, deskY - 120, 10, 5, 2).fill("#27313d");
  seatedOmega.moveTo(cx - 12, deskY - 104).lineTo(cx, deskY - 96).lineTo(cx + 12, deskY - 104).stroke({ color: "#61616a", width: 2 });
  seatedOmega.roundRect(cx + 30, deskY - 154, 28, 46, 4).fill("#54545d").stroke({ color: "#a9a4ad", width: 2 });
  seatedOmega.poly([cx + 36, deskY - 142, cx + 52, deskY - 132, cx + 38, deskY - 122]).fill(cyan);
  seatedOmega.rect(cx - 8, deskY - 146, 16, 7).fill(cyan);
  seatedOmega.roundRect(cx - 62, deskY - 58, 44, 18, 8).fill("#f4f3f5").stroke({ color: "#a9a4ad", width: 2 });
  seatedOmega.roundRect(cx + 18, deskY - 58, 44, 18, 8).fill("#f4f3f5").stroke({ color: "#a9a4ad", width: 2 });
  stage.addChild(seatedOmega);

  desk.roundRect(cx - 160, deskY, 320, 42, 6).fill("#f8f7f8").stroke({ color: "#c8c3cb", width: 2 });
  desk.rect(cx - 142, deskY + 42, 80, 150).fill("#d5d1d8").stroke({ color: "#bbb6bf", width: 2 });
  desk.rect(cx + 62, deskY + 42, 80, 150).fill("#d5d1d8").stroke({ color: "#bbb6bf", width: 2 });
  desk.rect(cx - 124, deskY + 72, 44, 7).fill(cyan);
  desk.rect(cx - 124, deskY + 110, 44, 7).fill(cyan);
  desk.rect(cx + 80, deskY + 72, 44, 7).fill(cyan);
  desk.rect(cx + 80, deskY + 110, 44, 7).fill(cyan);
  desk.roundRect(cx - 30, deskY + 42, 60, 24, 8).fill("#c6c1ca");
  desk.roundRect(cx - 16, deskY + 66, 32, 90, 5).fill("#beb8c2");
  desk.roundRect(cx - 42, deskY + 150, 84, 16, 8).fill("#b8b2bc");
  desk.circle(cx - 98, deskY - 18, 22).fill("#f2f0f3").stroke({ color: "#c7c1ca", width: 2 });
  desk.roundRect(cx - 16, deskY - 24, 62, 18, 4).fill("#f5f4f6").stroke({ color: "#bbb6bf", width: 2 });
  desk.roundRect(cx + 88, deskY - 24, 80, 50, 5).fill("#e9e7eb").stroke({ color: "#b9b3be", width: 2 });
  desk.rect(cx + 104, deskY - 5, 28, 3).fill(cyan);
  stage.addChild(desk);

  const lamp = new Graphics();
  lamp.moveTo(cx - 132, deskY).lineTo(cx - 116, deskY - 62).lineTo(cx - 78, deskY - 82).stroke({ color: "#bdb7c1", width: 5 });
  lamp.roundRect(cx - 96, deskY - 92, 58, 30, 8).fill("#f5f4f6").stroke({ color: "#bbb6bf", width: 2 });
  lamp.poly([cx - 88, deskY - 62, cx - 44, deskY - 72, cx - 60, deskY - 48]).fill({ color: "#eafffb", alpha: 0.45 });
  stage.addChild(lamp);

  const lights = new Graphics();
  lights.roundRect(112, 76, 84, 18, 7).fill("#ecfffb").stroke({ color: "#b7bac0", width: 2 });
  lights.roundRect(width - 196, 92, 84, 18, 7).fill("#8ff4e8").stroke({ color: "#b7bac0", width: 2 });
  lights.roundRect(cx - 58, 104, 116, 10, 4).fill("#c9c6cd");
  lights.roundRect(width - 218, 52, 130, 58, 6).fill("#d2cfd6").stroke({ color: "#b9b4be", width: 2 });
  for (let i = 0; i < 6; i += 1) {
    lights.rect(width - 198 + i * 18, 60, 10, 42).fill("#9997a0");
  }
  lights.roundRect(930, 176, 58, 112, 4).fill("#d9d6dc").stroke({ color: "#bbb6bf", width: 2 });
  lights.poly([948, 230, 960, 204, 976, 258, 960, 248]).stroke({ color: "#9b99a2", width: 5 });
  stage.addChild(lights);
}

async function drawOmega(emotion: OmegaEmotion) {
  const root = new Container();
  try {
    const texture = await Assets.load("/assets/omega/omega-transparent.png");
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    sprite.width = 118;
    sprite.height = 198;
    sprite.y = 118;
    root.addChild(sprite);

    const moodGlow = new Graphics();
    const glowColor = emotion === "sad" || emotion === "calm_negative" ? "#9a835a" : "#19c8b9";
    moodGlow.ellipse(0, 108, 44, 10).fill({ color: glowColor, alpha: 0.2 });
    root.addChild(moodGlow);
    return root;
  } catch {
    // Fall back to vector placeholder if the image asset is unavailable.
  }

  const body = new Graphics();
  body.roundRect(-30, 26, 60, 92, 24).fill("#fffaf0").stroke({ color: "#19c8b9", width: 2 });
  root.addChild(body);

  const head = new Graphics();
  head.circle(0, 0, 38).fill("#fffdf4").stroke({ color: "#dfd4be", width: 2 });
  head.poly([-36, -10, -20, -48, 18, -42, 36, -8, 24, -28, -4, -36]).fill("#f2ead7");
  root.addChild(head);

  const face = new Graphics();
  const eyeColor = emotion === "sad" || emotion === "calm_negative" ? "#9a835a" : "#5d4037";
  face.roundRect(-20, -8, 10, 4, 2).fill(eyeColor);
  face.roundRect(10, -8, 10, 4, 2).fill(eyeColor);
  if (emotion === "happy" || emotion === "proud") {
    face.arc(0, 8, 12, 0, Math.PI).stroke({ color: "#5d4037", width: 2 });
  } else if (emotion === "sad") {
    face.arc(0, 18, 10, Math.PI, Math.PI * 2).stroke({ color: "#9a835a", width: 2 });
  } else {
    face.moveTo(-9, 13).lineTo(9, 13).stroke({ color: "#5d4037", width: 2 });
  }
  root.addChild(face);
  return root;
}
