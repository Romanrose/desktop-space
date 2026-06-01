import { Application, Container, Graphics, Sprite, Text, Ticker } from "pixi.js";
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
  const arrowRef = useRef<Text | null>(null);

  useEffect(() => {
    let disposed = false;
    if (!hostRef.current) return;
    const hostElement: HTMLDivElement = hostRef.current;

    // 修复：init函数改为async以支持await
    async function init() {
      const app = new Application({
      width: hostElement.clientWidth,
      height: hostElement.clientHeight,
      backgroundColor: 0x0a1219,
      antialias: true
    });

    // 添加手动窗口大小变化监听
    const handleResize = () => {
      app.renderer.resize(hostElement.clientWidth, hostElement.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 在组件卸载时移除监听
    return () => {
      disposed = true;
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('resize', handleResize); // 新增这行
      appRef.current?.destroy(true);
      appRef.current = null;
      hostElement.replaceChildren();
    };

      if (disposed) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
      // 修复：添加类型断言解决Canvas不能赋值给Node的错误
      hostElement.appendChild(app.view as unknown as Node);

      const room = new Container();
      app.stage.addChild(room);
      drawRoom(room, app.screen.width, app.screen.height, prologueDone);

      // 预加载 Omega 图片纹理
      let omegaTexture;
      try {
        omegaTexture = await Assets.load("/assets/omega/omega-transparent.png");
      } catch (err) {
        console.warn("Omega 图片加载失败，将使用 fallback 绘制", err);
      }

      const player = drawOmega(emotion, omegaTexture);
      player.position.set(positionRef.current.x, positionRef.current.y);
      player.visible = true;
      playerRef.current = player;
      app.stage.addChild(player);

      // 箭头提示
      const arrow = new Text("↓", { fill: 0x00ccff, fontSize: 46, fontWeight: "700" });
      arrow.anchor.set(0.5);
      arrow.position.set(app.screen.width * 0.5, app.screen.height * 0.34);
      arrow.alpha = prologueDone ? 0 : 0.9;
      arrowRef.current = arrow;
      app.stage.addChild(arrow);

      // 修复：添加类型断言解决ticker不存在的错误，并指定ticker类型
      (app as any).ticker.add((ticker: Ticker) => {
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
        
        // 箭头闪烁与可见性
        if (arrowRef.current) {
          arrowRef.current.alpha = prologueDone ? 0 : 0.5 + Math.sin(performance.now() / 260) * 0.4;
        }
        
        const distance = Math.hypot(pos.x - app.screen.width * 0.5, pos.y - app.screen.height * 0.56);
        setNearDesk(distance < 170 && !prologueDone);
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

// 房间绘制函数保持不变（之前已经修复过）
function drawRoom(stage: Container, width: number, height: number, cleaned: boolean) {
  const cx = width * 0.5;
  const wallTop = height * 0.08;
  const wallBottom = height * 0.64;
  const floorTop = wallBottom;
  const cyan = 0x00ccff;
  const wall = cleaned ? 0x1a2a3a : 0x2a1e1a;
  const panel = cleaned ? 0x243447 : 0x3a2e22;
  const line = cleaned ? 0x4a6a8a : 0x6a5a4a;
  const softLine = cleaned ? 0x3a5a7a : 0x5a4a3a;

  const background = new Graphics();
  
  // 背景
  background.beginFill(0x0a1219);
  background.drawRect(0, 0, width, height);
  background.endFill();

  // 墙壁
  background.beginFill(wall);
  background.drawPolygon([
    82, wallTop,
    width - 82, wallTop,
    width - 18, 135,
    width - 78, wallBottom,
    78, wallBottom,
    18, 135
  ]);
  background.endFill();
  background.lineStyle(8, cleaned ? 0x2a4a6a : 0x5a4a3a);
  background.drawPolygon([
    82, wallTop,
    width - 82, wallTop,
    width - 18, 135,
    width - 78, wallBottom,
    78, wallBottom,
    18, 135
  ]);
  background.lineStyle(0);

  // 地板
  background.beginFill(cleaned ? 0x1a2a3a : 0x3a2a1a);
  background.drawPolygon([78, floorTop, width - 78, floorTop, width - 168, height - 28, 168, height - 28]);
  background.endFill();
  background.lineStyle(6, cleaned ? 0x2a4a6a : 0x5a4a3a);
  background.moveTo(78, floorTop);
  background.lineTo(width - 78, floorTop);
  background.lineStyle(0);

  // 透视线条
  background.lineStyle(2, cleaned ? 0x3a5a7a : 0x7a6a5a);
  background.moveTo(190, height - 28);
  background.lineTo(310, floorTop);
  background.moveTo(width - 190, height - 28);
  background.lineTo(width - 310, floorTop);
  background.lineStyle(0);

  // 边框
  background.lineStyle(2, cleaned ? 0x00ccff44 : 0xffaa0044);
  background.drawRect(0, 0, width, height);
  background.lineStyle(0);

  stage.addChild(background);

  const ribs = new Graphics();
  ribs.lineStyle(3, cleaned ? 0x3a5a7a : 0x7a6a5a);
  ribs.moveTo(20, 136);
  ribs.lineTo(90, 60);
  ribs.lineTo(248, 60);
  ribs.lineTo(300, 88);
  ribs.moveTo(width - 20, 136);
  ribs.lineTo(width - 90, 60);
  ribs.lineTo(width - 248, 60);
  ribs.lineTo(width - 300, 88);
  ribs.lineStyle(2, softLine);
  ribs.moveTo(86, wallBottom);
  ribs.lineTo(136, 150);
  ribs.moveTo(width - 86, wallBottom);
  ribs.lineTo(width - 136, 150);
  ribs.lineStyle(0);
  stage.addChild(ribs);

  // 窗户
  const windowFrame = new Graphics();
  const wx = cx - 210;
  const wy = height * 0.19;
  const ww = 420;
  const wh = 218;

  windowFrame.beginFill(cleaned ? 0x1a2a3a : 0x3a2a1a);
  windowFrame.drawPolygon([
    wx + 36, wy,
    wx + ww - 36, wy,
    wx + ww, wy + 34,
    wx + ww, wy + wh - 34,
    wx + ww - 36, wy + wh,
    wx + 36, wy + wh,
    wx, wy + wh - 34,
    wx, wy + 34
  ]);
  windowFrame.endFill();
  windowFrame.lineStyle(3, cleaned ? 0x4a6a8a : 0x8a7a6a);
  windowFrame.drawPolygon([
    wx + 36, wy,
    wx + ww - 36, wy,
    wx + ww, wy + 34,
    wx + ww, wy + wh - 34,
    wx + ww - 36, wy + wh,
    wx + 36, wy + wh,
    wx, wy + wh - 34,
    wx, wy + 34
  ]);
  windowFrame.lineStyle(0);

  windowFrame.beginFill(0x0a1a2a);
  windowFrame.drawPolygon([
    wx + 58, wy + 28,
    wx + ww - 58, wy + 28,
    wx + ww - 22, wy + 58,
    wx + ww - 22, wy + wh - 58,
    wx + ww - 58, wy + wh - 28,
    wx + 58, wy + wh - 28,
    wx + 22, wy + wh - 58,
    wx + 22, wy + 58
  ]);
  windowFrame.endFill();

  windowFrame.beginFill(cleaned ? 0x88ccff : 0xffcc88);
  windowFrame.drawCircle(wx + ww - 56, wy + 92, 76);
  windowFrame.endFill();
  windowFrame.beginFill(cleaned ? 0x66aadd : 0xddaa66, 0.34);
  windowFrame.drawCircle(wx + ww - 84, wy + 82, 108);
  windowFrame.endFill();

  // 星星
  windowFrame.beginFill(0xffffff);
  for (const [sx, sy, sr] of [
    [wx + 88, wy + 62, 2],
    [wx + 116, wy + 92, 1.6],
    [wx + 166, wy + 54, 2],
    [wx + 236, wy + 118, 1.5],
    [wx + 286, wy + 74, 1.8]
  ]) {
    windowFrame.drawCircle(sx, sy, sr);
  }
  windowFrame.endFill();

  stage.addChild(windowFrame);

  // 书架
  const shelf = new Graphics();
  shelf.beginFill(cleaned ? 0x1a2a3a : 0x3a2a1a);
  shelf.drawRoundedRect(36, height * 0.22, 150, 338, 12);
  shelf.endFill();
  shelf.lineStyle(3, cleaned ? 0x4a6a8a : 0x8a7a6a);
  shelf.drawRoundedRect(36, height * 0.22, 150, 338, 12);
  shelf.lineStyle(0);

  shelf.beginFill(cleaned ? 0x243447 : 0x4a3a22);
  shelf.drawRect(52, height * 0.26, 118, 108);
  shelf.drawRect(52, height * 0.46, 118, 72);
  shelf.endFill();
  shelf.lineStyle(3, cleaned ? 0x3a5a7a : 0x7a6a5a);
  shelf.moveTo(52, height * 0.41);
  shelf.lineTo(170, height * 0.41);
  shelf.lineStyle(0);

  shelf.beginFill(cleaned ? 0x1e2e3e : 0x3e2e1e);
  shelf.drawRoundedRect(52, height * 0.57, 118, 88, 8);
  shelf.endFill();

  // 书籍
  shelf.beginFill(0xffffff);
  shelf.drawRect(72, height * 0.28, 10, 78);
  shelf.endFill();
  shelf.beginFill(cleaned ? 0x88aacc : 0xccaa88);
  shelf.drawRect(86, height * 0.30, 13, 70);
  shelf.endFill();
  shelf.beginFill(cleaned ? 0x99bbdd : 0xddbb99);
  shelf.drawRect(103, height * 0.27, 15, 84);
  shelf.endFill();
  shelf.beginFill(cleaned ? 0x6699bb : 0xbb9966);
  shelf.drawRect(122, height * 0.32, 16, 60);
  shelf.endFill();
  shelf.beginFill(cleaned ? 0x557799 : 0x997755);
  shelf.drawRoundedRect(75, height * 0.49, 40, 56, 6);
  shelf.endFill();
  shelf.beginFill(cleaned ? 0xaaccff : 0xffccaa);
  shelf.drawRoundedRect(118, height * 0.49, 18, 34, 5);
  shelf.endFill();

  shelf.lineStyle(2, cleaned ? 0x3a5a7a : 0x7a6a5a);
  shelf.moveTo(58, height * 0.61);
  shelf.lineTo(164, height * 0.61);
  shelf.moveTo(58, height * 0.65);
  shelf.lineTo(164, height * 0.65);
  shelf.lineStyle(0);

  stage.addChild(shelf);

  // 床
  const bed = new Graphics();
  bed.beginFill(cleaned ? 0x1a2a3a : 0x3a2a1a);
  bed.drawRoundedRect(width - 264, height * 0.5, 210, 162, 18);
  bed.endFill();
  bed.lineStyle(3, cleaned ? 0x4a6a8a : 0x8a7a6a);
  bed.drawRoundedRect(width - 264, height * 0.5, 210, 162, 18);
  bed.lineStyle(0);

  bed.beginFill(cleaned ? 0x243447 : 0x4a3a22);
  bed.drawRoundedRect(width - 246, height * 0.54, 178, 58, 18);
  bed.endFill();
  bed.beginFill(0xffffff);
  bed.drawRoundedRect(width - 246, height * 0.6, 178, 78, 12);
  bed.endFill();
  bed.beginFill(cleaned ? 0x88aadd : 0xddaa88);
  bed.drawRoundedRect(width - 248, height * 0.62, 180, 52, 8);
  bed.endFill();
  bed.beginFill(0xffffff);
  bed.drawRoundedRect(width - 244, height * 0.52, 160, 32, 14);
  bed.endFill();

  stage.addChild(bed);

  // 显示器
  const displays = new Graphics();
  displays.beginFill(panel);
  displays.drawRoundedRect(208, height * 0.27, 78, 146, 8);
  displays.drawRoundedRect(width - 306, height * 0.27, 98, 156, 8);
  displays.endFill();
  displays.lineStyle(3, softLine);
  displays.drawRoundedRect(208, height * 0.27, 78, 146, 8);
  displays.drawRoundedRect(width - 306, height * 0.27, 98, 156, 8);
  displays.lineStyle(0);

  displays.beginFill(0x1a2a3a);
  displays.drawRoundedRect(222, height * 0.305, 50, 86, 5);
  displays.drawRoundedRect(width - 288, height * 0.305, 64, 98, 5);
  displays.endFill();
  displays.lineStyle(1, cyan);
  displays.drawRoundedRect(222, height * 0.305, 50, 86, 5);
  displays.drawRoundedRect(width - 288, height * 0.305, 64, 98, 5);
  displays.lineStyle(0);

  stage.addChild(displays);

  const displayText = new Container();
  const moodTitle = new Text("心境值", { fill: cyan, fontSize: 14, fontWeight: "700" });
  moodTitle.anchor.set(0.5);
  moodTitle.position.set(247, height * 0.335);
  displayText.addChild(moodTitle);
  const moodValue = new Text("30", { fill: cyan, fontSize: 30, fontWeight: "800" });
  moodValue.anchor.set(0.5);
  moodValue.position.set(247, height * 0.385);
  displayText.addChild(moodValue);
  const todo = new Text("今日计划\n☑ 适应新环境\n☑ 整理书架\n☐ 探索舱外", { fill: cyan, fontSize: 13, fontWeight: "700", lineHeight: 21 });
  todo.position.set(width - 278, height * 0.322);
  displayText.addChild(todo);
  stage.addChild(displayText);

  // 地毯
  const rug = new Graphics();
  rug.beginFill(cleaned ? 0x1a2a3a : 0x3a2a1a);
  rug.drawRoundedRect(cx - 170, height * 0.79, 340, 96, 12);
  rug.endFill();
  rug.lineStyle(2, cleaned ? 0x4a6a8a : 0x8a7a6a);
  rug.drawRoundedRect(cx - 170, height * 0.79, 340, 96, 12);
  rug.lineStyle(0);

  rug.lineStyle(5, cleaned ? 0x3a5a7a : 0x7a6a5a);
  rug.drawPolygon([cx - 32, height * 0.835, cx + 20, height * 0.825, cx + 42, height * 0.865, cx - 12, height * 0.875]);
  rug.lineStyle(0);

  stage.addChild(rug);

  // 书桌
  const desk = new Graphics();
  const deskY = height * 0.56;
  const seatedOmega = new Graphics();
  
  seatedOmega.beginFill(cyan, 0.15);
  seatedOmega.drawEllipse(cx, deskY - 22, 72, 18);
  seatedOmega.endFill();
  
  seatedOmega.beginFill(panel);
  seatedOmega.drawRoundedRect(cx - 32, deskY - 92, 64, 76, 24);
  seatedOmega.drawCircle(cx, deskY - 118, 46);
  seatedOmega.drawPolygon([cx - 42, deskY - 128, cx - 16, deskY - 168, cx + 18, deskY - 162, cx + 44, deskY - 130, cx + 26, deskY - 146, cx - 8, deskY - 152]);
  seatedOmega.endFill();
  seatedOmega.lineStyle(2, cleaned ? 0x4a6a8a : 0x8a7a6a);
  seatedOmega.drawRoundedRect(cx - 32, deskY - 92, 64, 76, 24);
  seatedOmega.drawCircle(cx, deskY - 118, 46);
  seatedOmega.drawPolygon([cx - 42, deskY - 128, cx - 16, deskY - 168, cx + 18, deskY - 162, cx + 44, deskY - 130, cx + 26, deskY - 146, cx - 8, deskY - 152]);
  seatedOmega.lineStyle(0);

  seatedOmega.beginFill(0x1a2a3a);
  seatedOmega.drawRoundedRect(cx - 22, deskY - 120, 10, 5, 2);
  seatedOmega.drawRoundedRect(cx + 12, deskY - 120, 10, 5, 2);
  seatedOmega.endFill();

  seatedOmega.lineStyle(2, 0x61616a);
  seatedOmega.moveTo(cx - 12, deskY - 104);
  seatedOmega.lineTo(cx, deskY - 96);
  seatedOmega.lineTo(cx + 12, deskY - 104);
  seatedOmega.lineStyle(0);

  seatedOmega.beginFill(0x3a4a5a);
  seatedOmega.drawRoundedRect(cx + 30, deskY - 154, 28, 46, 4);
  seatedOmega.endFill();
  seatedOmega.lineStyle(2, cleaned ? 0x4a6a8a : 0x8a7a6a);
  seatedOmega.drawRoundedRect(cx + 30, deskY - 154, 28, 46, 4);
  seatedOmega.lineStyle(0);

  seatedOmega.beginFill(cyan);
  seatedOmega.drawPolygon([cx + 36, deskY - 142, cx + 52, deskY - 132, cx + 38, deskY - 122]);
  seatedOmega.drawRect(cx - 8, deskY - 146, 16, 7);
  seatedOmega.endFill();

  seatedOmega.beginFill(panel);
  seatedOmega.drawRoundedRect(cx - 62, deskY - 58, 44, 18, 8);
  seatedOmega.drawRoundedRect(cx + 18, deskY - 58, 44, 18, 8);
  seatedOmega.endFill();
  seatedOmega.lineStyle(2, cleaned ? 0x4a6a8a : 0x8a7a6a);
  seatedOmega.drawRoundedRect(cx - 62, deskY - 58, 44, 18, 8);
  seatedOmega.drawRoundedRect(cx + 18, deskY - 58, 44, 18, 8);
  seatedOmega.lineStyle(0);

  stage.addChild(seatedOmega);

  desk.beginFill(panel);
  desk.drawRoundedRect(cx - 160, deskY, 320, 42, 6);
  desk.drawRect(cx - 142, deskY + 42, 80, 150);
  desk.drawRect(cx + 62, deskY + 42, 80, 150);
  desk.drawRoundedRect(cx - 30, deskY + 42, 60, 24, 8);
  desk.drawRoundedRect(cx - 16, deskY + 66, 32, 90, 5);
  desk.drawRoundedRect(cx - 42, deskY + 150, 84, 16, 8);
  desk.drawCircle(cx - 98, deskY - 18, 22);
  desk.drawRoundedRect(cx - 16, deskY - 24, 62, 18, 4);
  desk.drawRoundedRect(cx + 88, deskY - 24, 80, 50, 5);
  desk.endFill();
  desk.lineStyle(2, cleaned ? 0x4a6a8a : 0x8a7a6a);
  desk.drawRoundedRect(cx - 160, deskY, 320, 42, 6);
  desk.drawRect(cx - 142, deskY + 42, 80, 150);
  desk.drawRect(cx + 62, deskY + 42, 80, 150);
  desk.drawRoundedRect(cx - 30, deskY + 42, 60, 24, 8);
  desk.drawRoundedRect(cx - 16, deskY + 66, 32, 90, 5);
  desk.drawRoundedRect(cx - 42, deskY + 150, 84, 16, 8);
  desk.drawCircle(cx - 98, deskY - 18, 22);
  desk.drawRoundedRect(cx - 16, deskY - 24, 62, 18, 4);
  desk.drawRoundedRect(cx + 88, deskY - 24, 80, 50, 5);
  desk.lineStyle(0);

  desk.beginFill(cyan);
  desk.drawRect(cx - 124, deskY + 72, 44, 7);
  desk.drawRect(cx - 124, deskY + 110, 44, 7);
  desk.drawRect(cx + 80, deskY + 72, 44, 7);
  desk.drawRect(cx + 80, deskY + 110, 44, 7);
  desk.drawRect(cx + 104, deskY - 5, 28, 3);
  desk.endFill();

  stage.addChild(desk);

  // 台灯
  const lamp = new Graphics();
  lamp.lineStyle(5, cleaned ? 0x4a6a8a : 0x8a7a6a);
  lamp.moveTo(cx - 132, deskY);
  lamp.lineTo(cx - 116, deskY - 62);
  lamp.lineTo(cx - 78, deskY - 82);
  lamp.lineStyle(0);

  lamp.beginFill(panel);
  lamp.drawRoundedRect(cx - 96, deskY - 92, 58, 30, 8);
  lamp.endFill();
  lamp.lineStyle(2, cleaned ? 0x4a6a8a : 0x8a7a6a);
  lamp.drawRoundedRect(cx - 96, deskY - 92, 58, 30, 8);
  lamp.lineStyle(0);

  lamp.beginFill(cyan, 0.3);
  lamp.drawPolygon([cx - 88, deskY - 62, cx - 44, deskY - 72, cx - 60, deskY - 48]);
  lamp.endFill();

  stage.addChild(lamp);

  // 顶部灯光
  const lights = new Graphics();
  lights.beginFill(cleaned ? 0x88ccff33 : 0xffcc8833);
  lights.drawRoundedRect(112, 76, 84, 18, 7);
  lights.endFill();
  lights.lineStyle(2, cleaned ? 0x4a6a8a : 0x8a7a6a);
  lights.drawRoundedRect(112, 76, 84, 18, 7);
  lights.lineStyle(0);

  lights.beginFill(cyan);
  lights.drawRoundedRect(width - 196, 92, 84, 18, 7);
  lights.endFill();
  lights.lineStyle(2, cleaned ? 0x4a6a8a : 0x8a7a6a);
  lights.drawRoundedRect(width - 196, 92, 84, 18, 7);
  lights.lineStyle(0);

  lights.beginFill(cleaned ? 0x2a4a6a : 0x6a5a4a);
  lights.drawRoundedRect(cx - 58, 104, 116, 10, 4);
  lights.endFill();

  lights.beginFill(cleaned ? 0x1a2a3a : 0x3a2a1a);
  lights.drawRoundedRect(width - 218, 52, 130, 58, 6);
  lights.drawRoundedRect(930, 176, 58, 112, 4);
  lights.endFill();
  lights.lineStyle(2, cleaned ? 0x4a6a8a : 0x8a7a6a);
  lights.drawRoundedRect(width - 218, 52, 130, 58, 6);
  lights.drawRoundedRect(930, 176, 58, 112, 4);
  lights.lineStyle(0);

  lights.beginFill(cleaned ? 0x3a5a7a : 0x7a6a5a);
  for (let i = 0; i < 6; i += 1) {
    lights.drawRect(width - 198 + i * 18, 60, 10, 42);
  }
  lights.endFill();

  lights.lineStyle(5, cleaned ? 0x3a5a7a : 0x7a6a5a);
  lights.drawPolygon([948, 230, 960, 204, 976, 258, 960, 248]);
  lights.lineStyle(0);

  stage.addChild(lights);
}

function drawOmega(emotion: OmegaEmotion, texture?: import("pixi.js").Texture) {
  const root = new Container();
  if (texture) {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    sprite.width = 118;
    sprite.height = 198;
    sprite.y = 118;
    root.addChild(sprite);
  } else {
    // Fallback 绘图
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

  // 情绪光晕
  const moodGlow = new Graphics();
  const glowColor = emotion === "sad" || emotion === "calm_negative" ? 0x9a835a : 0x19c8b9;
  moodGlow.beginFill(glowColor, 0.2);
  moodGlow.drawEllipse(0, 108, 44, 10);
  moodGlow.endFill();
  root.addChild(moodGlow);

  // 如果使用了 fallback，绘制五官
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