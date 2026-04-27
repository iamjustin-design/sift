"use client";

import { useSiftBot } from "@/lib/bot/context";
import { BotAvatar } from "./BotAvatar";
import { ChatPanel } from "./ChatPanel";

export function SiftBot() {
  const { botState, setChatOpen, chatOpen } = useSiftBot();

  // Hidden state — don't render anything
  if (botState === "hidden") return null;

  // Welcome state is rendered by the page itself (BotGreeting)
  // SiftBot only handles collapsed + working states as overlays
  if (botState === "welcome") return null;

  // Working state — small overlay showing progress
  if (botState === "working") {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-surface-light-card dark:bg-surface-dark-card border border-border-light dark:border-border-dark rounded-full px-4 py-2 shadow-lg print:hidden">
        <BotAvatar size={36} className="animate-pulse" />
        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          Sifting...
        </span>
      </div>
    );
  }

  // Collapsed state — gold circle + chat panel
  return (
    <>
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-4 right-4 z-50 cursor-pointer animate-bot-pulse print:hidden"
        aria-label="Open BitSift Bot chat"
      >
        <BotAvatar size={52} />
      </button>
      <ChatPanel />
    </>
  );
}
