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
  test("default browser route starts with the prologue from the document", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("……你能看见我？")).toBeVisible();
    await page.getByRole("button", { name: "你是谁？" }).click();
    await expect(page.getByText("我叫Ω。维度翻译器把你的声音送到了这里。")).toBeVisible();
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

  test("dragging the avatar does not open its action menu", async ({ page }) => {
    await seedReadyState(page);
    await page.goto("/?view=floating");

    const avatar = page.getByRole("button", { name: "Ω", exact: true });
    const box = await avatar.boundingBox();
    if (!box) throw new Error("Avatar is not visible");

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 36, box.y + box.height / 2 + 12);
    await page.mouse.up();

    await expect(page.getByRole("button", { name: "输入" })).toBeHidden();
  });

  test("minimum mood locks interaction and exposes the rest guidance", async ({ page }) => {
    await seedReadyState(page);
    await page.addInitScript(() => {
      const raw = window.localStorage.getItem("omega.browser.state");
      const state = raw ? JSON.parse(raw) : {};
      window.localStorage.setItem("omega.browser.state", JSON.stringify({ ...state, mood: 15 }));
    });
    await page.goto("/?view=floating");

    await expect(page.getByText("Ω看起来很疲惫……点击太空舱让她休息一下吧")).toBeVisible();
    await page.getByRole("button", { name: "Ω", exact: true }).click();
    await expect(page.getByRole("button", { name: "输入" })).toBeHidden();
  });

  test("chat mode remains active until the chat panel closes", async ({ page }) => {
    await seedReadyState(page);
    await page.goto("/?view=floating");

    await page.getByRole("button", { name: "Ω", exact: true }).click();
    await page.getByRole("button", { name: "输入" }).click();
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("omega.browser.state") ?? "{}").currentMode)).toBe("chatting");

    await page.getByRole("button", { name: "关闭聊天" }).click();
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("omega.browser.state") ?? "{}").currentMode)).toBe("idle");
  });

  test("passive mood settlement preserves sub-hour remainder", async ({ page }) => {
    await seedReadyState(page);
    await page.addInitScript(() => {
      const raw = window.localStorage.getItem("omega.browser.state");
      const state = raw ? JSON.parse(raw) : {};
      const checkpoint = Date.now() - 90 * 60_000;
      window.localStorage.setItem("omega.browser.state", JSON.stringify({
        ...state,
        mood: 60,
        lastPassiveRewardTime: checkpoint,
      }));
    });
    await page.goto("/?view=floating");

    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("omega.browser.state") ?? "{}").mood)).toBe(62);
    const remainingMs = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("omega.browser.state") ?? "{}");
      return Date.now() - state.lastPassiveRewardTime;
    });
    expect(remainingMs).toBeGreaterThan(29 * 60_000);
    expect(remainingMs).toBeLessThan(31 * 60_000);
  });

  test("clean-capsule milestone opens its narrative instead of completing from display text", async ({ page }) => {
    await seedReadyState(page);
    await page.addInitScript(() => {
      const raw = window.localStorage.getItem("omega.browser.state");
      const state = raw ? JSON.parse(raw) : {};
      window.localStorage.setItem("omega.browser.state", JSON.stringify({
        ...state,
        mood: 100,
        completedMilestones: ["m1_first_greeting"],
        lastGreetingTime: Date.now(),
        pendingEvent: null,
      }));
    });
    await page.goto("/?view=floating");

    await expect(page.getByText("我应该打扫一下太空舱了……")).toBeVisible();
    await page.locator(".milestone-bubble__dismiss").click();
    await expect(page).toHaveURL(/view=capsule/);
    await expect(page.locator(".capsule-dialogue")).toBeVisible();
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

    await expect(page.locator(".chat-line--typing")).toBeVisible();
    await expect(chatInput).toBeDisabled();
    await expect(page.getByText("谢谢你陪我测试这个功能")).toBeVisible();
    await expect(page.getByText("嗯，我也有一点开心。像是舱壁上的灯忽然稳定了一些。")).toBeVisible();
    await expect(page.getByText("Ω · 开心 · 好感 13")).toBeVisible();
    await expect(page.getByLabel("叙事选项")).toBeVisible();
    await expect(page.getByRole("button", { name: "顺着这份开心继续聊" })).toBeVisible();
    await expect(page.getByRole("button", { name: "问Ω刚才想到了什么" })).toBeVisible();

    await page.getByRole("button", { name: "关闭聊天" }).click();
    await page.getByRole("button", { name: "Ω", exact: true }).click();
    await page.getByRole("button", { name: "记录" }).click();
    const recordList = page.locator(".record-list");
    await expect(recordList).toContainText("测试员：");
    await expect(recordList).toContainText("谢谢你陪我测试这个功能");
    await expect(recordList).toContainText("Ω：");
    await expect(recordList).toContainText("嗯，我也有一点开心。像是舱壁上的灯忽然稳定了一些。");
  });

  test("generated narrative choices and free input share the same conversation", async ({ page }) => {
    await seedReadyState(page);
    await page.goto("/?view=floating");

    await page.getByRole("button", { name: "Ω" }).click();
    await page.getByRole("button", { name: "输入" }).click();
    const chatInput = page.locator('input[placeholder="和Ω说话..."]');
    await chatInput.fill("谢谢你今天陪着我");
    await chatInput.press("Enter");

    await page.getByRole("button", { name: "问Ω刚才想到了什么" }).click();
    await expect(page.getByText("问Ω刚才想到了什么")).toBeVisible();
    await expect(page.getByLabel("叙事选项")).toBeVisible();

    await chatInput.fill("其实我更想听你讲讲今天发生的事");
    await chatInput.press("Enter");
    await expect(page.getByText("其实我更想听你讲讲今天发生的事")).toBeVisible();
    await expect(page.getByRole("button", { name: "问Ω现在在想什么" })).toBeVisible();
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
    await expect(page.locator("canvas")).toBeVisible();

    await page.getByRole("button", { name: "关闭太空舱" }).click();
    await expect(page).toHaveURL(/view=floating/);
    await expect(page.getByRole("button", { name: "Ω" })).toBeVisible();
  });
});
