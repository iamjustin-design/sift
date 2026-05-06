"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { useSiftBot } from "@/lib/bot/context";
import { parseCommand } from "@/lib/bot/command-parser";
import { BotAvatar } from "./BotAvatar";
import { ChatMessage } from "./ChatMessage";
import { QuickActions } from "./QuickActions";

export function ChatPanel() {
  const { chatOpen, setChatOpen, messages, addMessage, currentUrl, setSnapshotOpen, editFlags, setEditFlag, editMode, setEditMode, removedIds, removeId, addedIds, addId, restoreAllIds, siftedContext } = useSiftBot();
  const [input, setInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or thinking state changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  if (!chatOpen) return null;

  const askLLM = async (text: string) => {
    setThinking(true);
    try {
      const res = await fetch("/api/sift/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          articleTitle: siftedContext?.title || "",
          editManifest: siftedContext?.editManifest || [],
          state: {
            hideImages: editFlags.hideImages,
            editMode,
            removedIds,
          },
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        addMessage("bot", errBody.error ? `Sorry — ${errBody.error}` : "Sorry, something went wrong on my end.");
        return;
      }
      const data: { reply: string; action: { type: string; ids?: string[] } } = await res.json();
      if (data.reply) addMessage("bot", data.reply);
      switch (data.action?.type) {
        case "hide-images": setEditFlag("hideImages", true); break;
        case "show-images": setEditFlag("hideImages", false); break;
        case "enter-edit-mode": setEditMode(true); break;
        case "exit-edit-mode": setEditMode(false); break;
        case "restore-all": restoreAllIds(); break;
        case "remove-elements":
          (data.action.ids || []).forEach((id) => removeId(id));
          break;
        case "add-elements":
          (data.action.ids || []).forEach((id) => addId(id));
          break;
        case "show-original":
          setSnapshotOpen(true);
          setChatOpen(false);
          break;
      }
    } catch {
      addMessage("bot", "Network error — please try again.");
    } finally {
      setThinking(false);
    }
  };

  const runCommand = (text: string) => {
    const cmd = parseCommand(text);
    if (cmd.type === "hide-images") {
      if (editFlags.hideImages) {
        addMessage("bot", "Images are already hidden. Say “show images” to bring them back.");
      } else {
        setEditFlag("hideImages", true);
        addMessage("bot", "Done — images hidden. Say “show images” to bring them back.");
      }
      return;
    }
    if (cmd.type === "show-images") {
      if (!editFlags.hideImages) {
        addMessage("bot", "Images are already showing.");
      } else {
        setEditFlag("hideImages", false);
        addMessage("bot", "Images are back.");
      }
      return;
    }
    if (cmd.type === "edit-on") {
      if (editMode) {
        addMessage("bot", "Already in edit mode. Tap anything to remove it, or open the original to add things back.");
      } else {
        setEditMode(true);
        addMessage("bot", "Edit mode on — tap anything to remove it. Open “show original” to add ghosted items back. Say “done” when finished.");
      }
      return;
    }
    if (cmd.type === "edit-off") {
      if (!editMode) {
        addMessage("bot", "Not in edit mode. Say “edit” to start removing things.");
      } else {
        setEditMode(false);
        const note = removedIds.length > 0 ? ` ${removedIds.length} item${removedIds.length === 1 ? "" : "s"} hidden.` : "";
        addMessage("bot", `Done editing.${note} Say “restore all” to bring everything back.`);
      }
      return;
    }
    if (cmd.type === "restore-all") {
      const total = removedIds.length + addedIds.length;
      if (total === 0) {
        addMessage("bot", "Nothing to restore.");
      } else {
        restoreAllIds();
        addMessage("bot", "Reverted to the original sift.");
      }
      return;
    }
    // No regex match — fall back to the LLM
    askLLM(text);
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    addMessage("user", trimmed);
    setInput("");
    setTimeout(() => runCommand(trimmed), 250);
  };

  const handleQuickAction = (action: string) => {
    if (action === "original") {
      setSnapshotOpen(true);
      setChatOpen(false);
      addMessage("user", "Show original");
      addMessage("bot", "Showing the original page. Click \"Back to sifted\" to return.");
      return;
    }
    if (action === "edit") {
      addMessage("user", editMode ? "Done editing" : "Edit");
      setTimeout(() => runCommand(editMode ? "done" : "edit"), 200);
      return;
    }
    if (action === "restore") {
      addMessage("user", "Restore all");
      setTimeout(() => runCommand("restore all"), 200);
      return;
    }
    addMessage("user", `Quick action: ${action}`);
    setTimeout(() => {
      addMessage("bot", `The "${action}" feature is coming in a future update!`);
    }, 500);
  };

  const domain = currentUrl ? new URL(currentUrl).hostname : null;

  return (
    <div className="fixed bottom-20 right-4 w-[380px] max-h-[500px] bg-surface-light-card dark:bg-surface-dark-card border border-border-light dark:border-border-dark rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 animate-slide-up max-sm:bottom-16 max-sm:right-2 max-sm:left-2 max-sm:w-auto print:hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-light dark:border-border-dark">
        <BotAvatar size={28} />
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">BitSift Bot</div>
        </div>
        <button
          onClick={() => setChatOpen(false)}
          aria-label="Close chat"
          className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-lg cursor-pointer"
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
        {thinking && (
          <div className="flex gap-2 items-start">
            <BotAvatar size={28} className="shrink-0 mt-0.5" />
            <div className="bg-surface-light dark:bg-surface-dark px-3 py-2 rounded-xl rounded-bl-sm text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-flex gap-0.5">
                <span className="animate-pulse">·</span>
                <span className="animate-pulse" style={{ animationDelay: "150ms" }}>·</span>
                <span className="animate-pulse" style={{ animationDelay: "300ms" }}>·</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <QuickActions onAction={handleQuickAction} editMode={editMode} hasEdits={removedIds.length > 0 || addedIds.length > 0} />

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
          <button type="submit" className="min-h-10 px-4 py-2 text-xs font-bold bg-sift-gold text-white rounded-lg cursor-pointer hover:bg-sift-gold-dark">
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
          <button type="submit" className="min-h-10 px-4 py-2 text-xs font-bold bg-sift-gold text-white rounded-lg cursor-pointer hover:bg-sift-gold-dark">
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
