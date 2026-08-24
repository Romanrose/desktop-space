import { expect, test } from "@playwright/test";

const readyState = {
  nickname: "测试员",
  prologueDone: true,
  mood: 60,
  affinity: 12,
  emotion: "calm_positive",
  currentMode: "idle",
  unlocked: {
    activeGreeting: true,
    cleanCapsule: false,
    game: false,
    writing: false
  }
};

async function seedReadyState(page: import("@playwright/test").Page) {
  await page.addInitScript((state) => {
    window.localStorage.setItem("omega.browser.state", JSON.stringify(state));
    window.localStorage.removeItem("omega.browser.memories");
    window.localStorage.setItem("omega.browser.forceMock", "1");
  }, readyState);
}

test.describe("Ω desktop pet functional prototype", () => {
  test("confirming M7 unlock creates the first diary and unlocks writing", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("omega.browser.state", JSON.stringify({
        nickname: "测试员",
        prologueDone: true,
        mood: 600,
        affinity: 60,
        emotion: "calm_positive",
        currentMode: "idle",
        completedMilestones: [
          "m1_first_greeting", "m2_clean_capsule", "m3_show_world",
          "m4_childhood_story", "m5_construction", "m6_game_unlock"
        ],
        stories: [],
        lastWritingAt: 0,
        unlocked: { activeGreeting: true, cleanCapsule: true, game: true, writing: false, bookshelf: false, construction: true, gardening: false }
      }));
      window.localStorage.setItem("omega.browser.forceMock", "1");
    });
    await page.goto("/?view=floating");

    await expect(page.getByText("我想写故事……")).toBeVisible();
    await page.getByRole("button", { name: "✓" }).click();
    await expect.poll(() => page.evaluate(() => {
      const state = JSON.parse(window.localStorage.getItem("omega.browser.state") ?? "{}");
      return {
        m7: state.completedMilestones?.includes("m7_writing"),
        writing: state.unlocked?.writing,
        bookshelf: state.unlocked?.bookshelf,
        stories: state.stories?.length ?? 0,
        hasWritingTimestamp: (state.lastWritingAt ?? 0) > 0,
      };
    })).toEqual({
      m7: true,
      writing: true,
      bookshelf: true,
      stories: 1,
      hasWritingTimestamp: true,
    });
  });

  test("M7 automatically turns remembered player context into a persisted diary", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("omega.browser.state", JSON.stringify({
        nickname: "小林",
        prologueDone: true,
        mood: 600,
        affinity: 60,
        emotion: "calm_positive",
        currentMode: "idle",
        completedMilestones: ["m7_writing"],
        stories: [],
        lastWritingAt: 0,
        unlocked: { activeGreeting: true, cleanCapsule: true, game: false, writing: true, bookshelf: true, construction: false, gardening: false }
      }));
      window.localStorage.setItem("omega.browser.memories", JSON.stringify(["玩家提到：周末想去看海"]));
      window.localStorage.setItem("omega.browser.forceMock", "1");
    });
    await page.goto("/?view=floating");

    await expect.poll(() => page.evaluate(() => {
      const state = JSON.parse(window.localStorage.getItem("omega.browser.state") ?? "{}");
      return { stories: state.stories?.length ?? 0, hasWritingTimestamp: (state.lastWritingAt ?? 0) > 0 };
    })).toEqual({ stories: 1, hasWritingTimestamp: true });

    await page.getByRole("button", { name: "Ω" }).click();
    await page.getByRole("button", { name: "事项" }).click();
    await page.getByRole("button", { name: "书架" }).click();
    await page.getByRole("button", { name: "写给小林的第 1 页" }).click();
    await expect(page.getByText("太空舱日志，第 1 次记录。")).toBeVisible();
    await expect(page.getByText(/周末想去看海/)).toBeVisible();
    await expect(page.getByRole("button", { name: "写日记" })).toHaveCount(0);
    await page.locator(".bookshelf-panel--reading").getByRole("button", { name: "返回" }).click();
    await expect(page.getByText(/自动写下/)).toBeVisible();
  });

  test("default browser route starts with the prologue from the document", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("……你能看见我？")).toBeVisible();
    await page.getByRole("button", { name: "你是谁？" }).click();
    await expect(page.getByText("我叫Ω。维度转译器把你的声音送到了这里。")).toBeVisible();
    await page.getByLabel("我应该怎么称呼你？").fill("测试员");
    await page.getByRole("button", { name: "确定" }).click();

    await expect(page.getByText("Ω 太空舱")).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("floating window exposes document-defined root and task bubbles", async ({ page }) => {
    await seedReadyState(page);
    await page.goto("/?view=floating");

    await expect(page.getByText("Ω · 平静 · 好感 12")).toBeVisible();
    await page.getByRole("button", { name: "Ω" }).click();
    await expect(page.getByRole("button", { name: "输入" })).toBeVisible();
    await expect(page.getByRole("button", { name: "记录" })).toBeVisible();
    await expect(page.getByRole("button", { name: "事项" })).toBeVisible();
    await expect(page.getByRole("button", { name: "太空舱" })).toBeVisible();

    await page.getByRole("button", { name: "事项" }).click();
    await expect(page.getByRole("button", { name: "闹钟" })).toBeVisible();
    await expect(page.getByRole("button", { name: "游戏" })).toBeVisible();
    await expect(page.getByRole("button", { name: "专注模式" })).toBeVisible();
  });

  test("chat records recent bubbles, mood changes, and full session history", async ({ page }) => {
    await seedReadyState(page);
    await page.goto("/?view=floating");

    await page.getByRole("button", { name: "Ω" }).click();
    await page.getByRole("button", { name: "输入" }).click();
    await expect(page.getByRole("button", { name: "关闭聊天" })).toBeVisible();
    const chatInput = page.locator('input[placeholder="和Ω说话..."]');
    await chatInput.fill("谢谢你陪我测试这个功能");
    await expect(chatInput).toHaveValue("谢谢你陪我测试这个功能");
    await chatInput.press("Enter");

    await expect(page.getByText("谢谢你陪我测试这个功能")).toBeVisible();
    await expect(page.getByText("嗯，我也有一点开心。像是舱壁上的灯忽然稳定了一些。")).toBeVisible();
    await expect(page.getByText("Ω · 开心 · 好感 13")).toBeVisible();

    await page.getByRole("button", { name: "Ω" }).click();
    await page.getByRole("button", { name: "记录" }).click();
    const recordList = page.locator(".record-list");
    await expect(recordList).toContainText("测试员：");
    await expect(recordList).toContainText("谢谢你陪我测试这个功能");
    await expect(recordList).toContainText("Ω：");
    await expect(recordList).toContainText("嗯，我也有一点开心。像是舱壁上的灯忽然稳定了一些。");
  });

  test("chat bubble can be dismissed", async ({ page }) => {
    await seedReadyState(page);
    await page.goto("/?view=floating");

    await page.getByRole("button", { name: "Ω" }).click();
    await page.getByRole("button", { name: "输入" }).click();
    await expect(page.getByLabel("Ω 对话")).toBeVisible();
    await page.getByRole("button", { name: "关闭聊天" }).click();
    await expect(page.getByLabel("Ω 对话")).toBeHidden();

    await page.getByRole("button", { name: "Ω" }).click();
    await page.getByRole("button", { name: "输入" }).click();
    await expect(page.getByLabel("Ω 对话")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Ω 对话")).toBeHidden();
  });

  test("capsule route renders the room, movement surface, and close action", async ({ page }) => {
    await seedReadyState(page);
    await page.goto("/?view=capsule");

    await expect(page.getByText("Ω 太空舱")).toBeVisible();
    await expect(page.getByText("WASD 移动，靠近书桌后交互")).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();

    await page.getByRole("button", { name: "关闭太空舱" }).click();
    await expect(page).toHaveURL(/view=floating/);
    await expect(page.getByRole("button", { name: "Ω" })).toBeVisible();
  });
});
