"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { useSiftBot } from "@/lib/bot/context";
import { BotAvatar } from "./BotAvatar";
import { ChatMessage } from "./ChatMessage";
import { QuickActions } from "./QuickActions";

export function ChatPanel() {
  const { chatOpen, setChatOpen, messages, addMessage, currentUrl } = useSiftBot();
  const [input, setInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!chatOpen) return null;

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    addMessage("user", input.trim());
    // Phase C will wire this to the LLM endpoint
    // For now, echo a placeholder response
    setTimeout(() => {
      addMessage("bot", "Chat is coming soon! For now, I can only sift pages for you.");
    }, 500);
    setInput("");
  };

  const handleQuickAction = (action: string) => {
    addMessage("user", `Quick action: ${action}`);
    setTimeout(() => {
      addMessage("bot", `The "${action}" feature is coming in a future update!`);
    }, 500);
  };

  const domain = currentUrl ? new URL(currentUrl).hostname : null;

  return (
    <div className="fixed bottom-20 right-4 w-[380px] max-h-[500px] bg-surface-light-card dark:bg-surface-dark-card border border-border-light dark:border-border-dark rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 animate-slide-up max-sm:bottom-16 max-sm:right-2 max-sm:left-2 max-sm:w-auto">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-light dark:border-border-dark">
        <BotAvatar size={28} />
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">BitSift Bot</div>
        </div>
        <button
          onClick={() => setChatOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Context bar */}
      {domain && (
        <div className="px-4 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-b border-border-light dark:border-border-dark truncate">
          Sifting: <span className="text-sift-gold font-medium">{domain}</span>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[200px] max-h-[300px]">
        {messages.length === 0 && (
          <div className="flex gap-2 items-start">
            <BotAvatar size={28} className="shrink-0 mt-0.5" />
            <div className="bg-surface-light dark:bg-surface-dark px-3 py-2 rounded-xl rounded-bl-sm text-sm text-gray-700 dark:text-gray-300">
              Here&apos;s your sifted content! Ask me to adjust anything.
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>

      {/* Quick actions */}
      <QuickActions onAction={handleQuickAction} />

      {/* Chat input */}
      {showUrlInput ? (
        <form
          onSubmit={(e) => { e.preventDefault(); setShowUrlInput(false); }}
          className="flex gap-2 px-3 py-2 border-t border-border-light dark:border-border-dark"
        >
          <input
            type="text"
            placeholder="Paste a new URL..."
            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-lg outline-none focus:border-sift-gold"
          />
          <button type="submit" className="px-3 py-2 text-xs font-bold bg-sift-gold text-white rounded-lg cursor-pointer">
            Sift
          </button>
          <button type="button" onClick={() => setShowUrlInput(false)} className="text-xs text-gray-400 cursor-pointer">
            Cancel
          </button>
        </form>
      ) : (
        <form onSubmit={handleSend} className="flex gap-2 px-3 py-2 border-t border-border-light dark:border-border-dark">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the sifted content..."
            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-lg outline-none focus:border-sift-gold"
          />
          <button type="submit" className="px-3 py-2 text-xs font-bold bg-sift-gold text-white rounded-lg cursor-pointer">
            Send
          </button>
        </form>
      )}

      {/* Sift new URL link */}
      {!showUrlInput && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowUrlInput(true)}
            className="text-xs text-sift-gold hover:text-sift-gold-dark dark:hover:text-sift-gold-light cursor-pointer"
          >
            Sift new URL
          </button>
        </div>
      )}
    </div>
  );
}
