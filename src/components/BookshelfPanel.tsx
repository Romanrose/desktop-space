/**
 * 书架面板 — 查看和管理 Ω 写过的故事
 *
 * 通过 M7（写作）解锁。未解锁时显示占位文案。
 */

import { useEffect, useState } from "react";
import type { OmegaState, OmegaStory } from "../types";
import { createShortStory, getNextDiaryAt } from "../systems/writing";

type Props = {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
  onClose: () => void;
};

export default function BookshelfPanel({ state, updateState, onClose }: Props) {
  const unlocked = (state.completedMilestones ?? []).includes("m7_writing") ||
    (state.stories ?? []).length > 0;
  const [stories, setStories] = useState<OmegaStory[]>(state.stories ?? []);
  const [viewingStory, setViewingStory] = useState<OmegaStory | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");

  // 自动日记可能在书架打开期间完成，保持列表与持久化状态同步。
  useEffect(() => {
    setStories(state.stories ?? []);
  }, [state.stories]);

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
    const newStory = createShortStory(state);
    const updated = [...stories, newStory].slice(-999);
    setStories(updated);
    setViewingStory(newStory);
    await updateState({ stories: updated });
  }

  const nextDiaryAt = getNextDiaryAt(state);
  const canWriteDiary = (state.completedMilestones ?? []).includes("m7_writing") && state.mood >= 200;

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
        <div className="bookshelf-panel__write-actions">
          <button type="button" onClick={writeNewStory}>写短篇</button>
        </div>
      </header>

      <div className="bookshelf-panel__list">
        {canWriteDiary && nextDiaryAt > Date.now() && (
          <p className="bookshelf-panel__schedule">
            Ω 正在整理下一篇日记，将在 {new Date(nextDiaryAt).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" })} 自动写下。
          </p>
        )}
        {displayStories.length === 0 ? (
          <p className="bookshelf-panel__empty">
            {activeTab === "favorites" ? "还没有收藏的故事。" : "还没有写过的内容。可以请 Ω 写一篇短篇，或等待下一篇日记自动出现。"}
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
