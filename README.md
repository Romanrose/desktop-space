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
- 游戏代打能力。
- 主线 2 以后完整剧情。
