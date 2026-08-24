# Ω Desktop Pet Prototype

这是根据两份设定文档落地的首版桌宠原型，技术栈为 Electron + React + PixiJS。

## 运行

```bash
npm install
npm run dev
```

生产构建检查：

```bash
npm run typecheck
npm run build
npm run test:e2e
npm start
```

## AI 配置

没有环境变量时，应用会使用本地降级人格回复，方便离线跑通原型。

当前已支持 OpenAI-compatible 的 Chat Completions 接口，默认读取 `.env.local`：

```bash
MIMO_API_KEY=你的_key
MIMO_MODEL=mimo-v2-flash
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
```

启动：

```bash
npm run dev
```

为了兼容其它供应商，也可以使用 `OPENAI_API_KEY`、`OPENAI_MODEL`、`OPENAI_BASE_URL`。

## 已实现范围

- 首次启动进入太空舱序幕。
- 昵称输入与书桌引导。
- 完成序幕后打开透明置顶悬浮窗。
- 悬浮窗展示 Ω、心境值、好感度、情绪状态。
- 气泡菜单包含输入、记录、事项、太空舱。
- 聊天支持最近两轮气泡展示、本次记录查看、记忆摘要、本地状态持久化。
- 聊天可勾选屏幕识别；截图失败时自动降级为纯文本。
- 太空舱使用 PixiJS 绘制占位 2D 房间、Ω角色、书桌交互范围与 WASD 移动。

## 功能测试

测试用例位于 `tests/e2e/omega-prototype.spec.ts`，覆盖设定文档首版范围：

- 首次启动序幕与昵称输入。
- 悬浮窗根气泡和事项气泡。
- 聊天、最近气泡、心境/好感变化、本次记录。
- 太空舱场景、PixiJS canvas、关闭后回到悬浮窗。

运行：

```bash
npm run test:e2e
```

## 暂未实现

- 正式美术资源和动作序列。
- 闹钟倒计时、专注累计时长。
- 合成机、装修、扩建、书架写作周期。
- 主线 2 以后完整剧情。

## 游戏代打（自动接管）

游戏代打能力已接入 Ω 工作台：事项 -> 游戏 -> 一键开始。

玩家不需要手动下载、安装或打开任何第三方工具。首次点击时会由后端自动准备代打环境：优先使用仓库内 `game/bettergi/` 的离线包，没有时才从官方源拉取，准备过程对玩家不可见。

需要本机已经安装并启动过原神，后端会自动定位安装路径；原神未运行时，一键开始会先拉起原神并等待进入主界面。

开发者可以手动执行 `game/scripts/setup-bettergi.ps1` 预装引擎到 `game/bettergi/`，这样玩家首次使用时无需联网。
