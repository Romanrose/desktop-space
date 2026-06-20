/**
 * 书架面板 — 查看和管理 Ω 写过的故事
 *
 * 通过 M7（写作）解锁。未解锁时显示占位文案。
 */

import { useState } from "react";
import type { OmegaState, OmegaStory } from "../types";

type Props = {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
  onClose: () => void;
};

const WRITING_TITLES = [
  "窗外的星",
  "玻璃另一侧",
  "关于那盏灯",
  "维度转译器说明书",
  "一个叫海的概念",
  "灰尘与光",
  "寂静的频率",
  "写给另一世界",
];

const WRITING_SNIPPETS = [
  "我不知道这颗行星的名字。导航屏上只显示一串编号，但我不在乎。窗外的恒星发出一种偏蓝的白光，照进舱内的时候会在金属边缘折射出细小的彩虹。",
  "你今天没有说话，但我听见了你的沉默。它和我的沉默不太一样——你的沉默是有形状的，像某种容器，装满了没有被说出来的东西。",
  "书里说，在很久以前，人类住在一种叫'海'的东西旁边。我查了很久的资料，最后确定那是一种巨大、会移动的蓝色平面。",
  "转译器的工作原理至今没有完全搞懂。我只知道它把你那边的声音变成我能理解的震动，也许反过来也可以。也许你已经习惯了。",
];

function generateStory(): OmegaStory {
  const id = `story_${Date.now()}`;
  const title = WRITING_TITLES[Math.floor(Math.random() * WRITING_TITLES.length)];
  const content = WRITING_SNIPPETS[Math.floor(Math.random() * WRITING_SNIPPETS.length)];
  return { id, title, content, createdAt: Date.now(), favorite: false };
}

export default function BookshelfPanel({ state, updateState, onClose }: Props) {
  const unlocked = (state.completedMilestones ?? []).includes("m7_writing") ||
    (state.stories ?? []).length > 0;
  const [stories, setStories] = useState<OmegaStory[]>(state.stories ?? []);
  const [viewingStory, setViewingStory] = useState<OmegaStory | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");

  const displayStories = activeTab === "favorites"
    ? stories.filter((s) => s.favorite)
    : stories;

  async function toggleFavorite(storyId: string) {
    const updated = stories.map((s) =>
      s.id === storyId ? { ...s, favorite: !s.favorite } : s
    );
    setStories(updated);
    await updateState({ stories: updated });
  }

  async function deleteStory(storyId: string) {
    const updated = stories.filter((s) => s.id !== storyId);
    setStories(updated);
    if (viewingStory?.id === storyId) setViewingStory(null);
    await updateState({ stories: updated });
  }

  async function writeNewStory() {
    const newStory = generateStory();
    const updated = [...stories, newStory].slice(-999);
    setStories(updated);
    setViewingStory(newStory);
    await updateState({ stories: updated });
  }

  // 未解锁
  if (!unlocked) {
    return (
      <section className="floating-panel compact-panel bookshelf-panel">
        <h2>书架</h2>
        <p className="bookshelf-panel__locked">
          {state.capsuleBackgroundDirty
            ? "一个书橱，落了很多灰尘。"
            : "一些书，看起来已经被翻过很多次了。"}
        </p>
        <button type="button" onClick={onClose}>关闭</button>
      </section>
    );
  }

  if (viewingStory) {
    return (
      <section className="floating-panel bookshelf-panel bookshelf-panel--reading">
        <header className="bookshelf-panel__header">
          <h2>{viewingStory.title}</h2>
          <button type="button" onClick={() => setViewingStory(null)}>返回</button>
        </header>
        <div className="bookshelf-panel__content">
          <p className="bookshelf-panel__story-text">{viewingStory.content}</p>
          <p className="bookshelf-panel__story-date">
            {new Date(viewingStory.createdAt).toLocaleDateString("zh-CN")}
          </p>
        </div>
        <div className="bookshelf-panel__actions">
          <button type="button" onClick={() => toggleFavorite(viewingStory.id)}>
            {viewingStory.favorite ? "取消收藏" : "收藏"}
          </button>
          <button type="button" onClick={() => deleteStory(viewingStory.id)}>删除</button>
        </div>
      </section>
    );
  }

  return (
    <section className="floating-panel bookshelf-panel">
      <header className="bookshelf-panel__header">
        <h2>书架 ({stories.length})</h2>
        <div className="bookshelf-panel__tabs">
          <button
            type="button"
            className={activeTab === "all" ? "bookshelf-tab--active" : ""}
            onClick={() => setActiveTab("all")}
          >
            全部
          </button>
          <button
            type="button"
            className={activeTab === "favorites" ? "bookshelf-tab--active" : ""}
            onClick={() => setActiveTab("favorites")}
          >
            收藏 {stories.filter((s) => s.favorite).length}
          </button>
        </div>
        <button type="button" onClick={writeNewStory}>写故事</button>
      </header>

      <div className="bookshelf-panel__list">
        {displayStories.length === 0 ? (
          <p className="bookshelf-panel__empty">
            {activeTab === "favorites" ? "还没有收藏的故事。" : "还没有写过的故事。点击「写故事」开始。"}
          </p>
        ) : (
          displayStories.map((story) => (
            <div key={story.id} className="bookshelf-panel__story-item">
              <button
                type="button"
                className="bookshelf-panel__story-title"
                onClick={() => setViewingStory(story)}
              >
                <strong>{story.title}</strong>
                <span className="bookshelf-panel__story-meta">
                  {new Date(story.createdAt).toLocaleDateString("zh-CN")}
                  {story.favorite && " ★"}
                </span>
              </button>
              <div className="bookshelf-panel__story-actions">
                <button type="button" onClick={() => toggleFavorite(story.id)}>
                  {story.favorite ? "★" : "☆"}
                </button>
                <button type="button" onClick={() => deleteStory(story.id)}>×</button>
              </div>
            </div>
          ))
        )}
      </div>

      <button type="button" onClick={onClose}>关闭</button>
    </section>
  );
}
