"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { BotState, ChatMessage, EditFlags, SiftBotContextType, SiftedContext } from "./types";

const DEFAULT_EDIT_FLAGS: EditFlags = { hideImages: false };

const SiftBotContext = createContext<SiftBotContextType>({
  botState: "welcome",
  setBotState: () => {},
  chatOpen: false,
  setChatOpen: () => {},
  messages: [],
  addMessage: () => {},
  currentUrl: null,
  setCurrentUrl: () => {},
  snapshotOpen: false,
  setSnapshotOpen: () => {},
  editFlags: DEFAULT_EDIT_FLAGS,
  setEditFlag: () => {},
  editMode: false,
  setEditMode: () => {},
  removedIds: [],
  removeId: () => {},
  addedIds: [],
  addId: () => {},
  removeAddedId: () => {},
  restoreAllIds: () => {},
  setEditState: () => {},
  siftedContext: null,
  setSiftedContext: () => {},
});

export function useSiftBot() {
  return useContext(SiftBotContext);
}

const HIDDEN_ROUTES = ["/login", "/signup", "/account"];

export function SiftBotProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [botStateOverride, setBotStateOverride] = useState<BotState | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUrl, setCurrentUrlState] = useState<string | null>(null);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [editFlags, setEditFlags] = useState<EditFlags>(DEFAULT_EDIT_FLAGS);
  const [editMode, setEditMode] = useState(false);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [siftedContext, setSiftedContext] = useState<SiftedContext | null>(null);

  const setEditFlag = useCallback(<K extends keyof EditFlags>(key: K, value: EditFlags[K]) => {
    setEditFlags((prev) => ({ ...prev, [key]: value }));
  }, []);

  const removeId = useCallback((id: string) => {
    // If the id was previously added back, just un-add it. Otherwise mark removed.
    setAddedIds((prev) => prev.filter((x) => x !== id));
    setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const addId = useCallback((id: string) => {
    // If the id was previously removed, just un-remove it. Otherwise mark added.
    setRemovedIds((prev) => prev.filter((x) => x !== id));
    setAddedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const removeAddedId = useCallback((id: string) => {
    setAddedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const restoreAllIds = useCallback(() => {
    setRemovedIds([]);
    setAddedIds([]);
  }, []);

  const setEditState = useCallback(
    (state: { hideImages?: boolean; removedIds?: string[]; addedIds?: string[] }) => {
      if (typeof state.hideImages === "boolean") {
        setEditFlags((prev) => ({ ...prev, hideImages: state.hideImages! }));
      }
      if (Array.isArray(state.removedIds)) setRemovedIds(state.removedIds);
      if (Array.isArray(state.addedIds)) setAddedIds(state.addedIds);
    },
    []
  );

  const setCurrentUrl = useCallback((url: string | null) => {
    setCurrentUrlState((prev) => {
      if (prev !== url) {
        setEditFlags(DEFAULT_EDIT_FLAGS);
        setEditMode(false);
        setRemovedIds([]);
        setAddedIds([]);
        // Note: siftedContext is intentionally not cleared here — pages set it
        // explicitly after fetch. Clearing it inside this functional updater
        // races with the page's setSiftedContext(...) and wipes it.
      }
      return url;
    });
  }, []);

  const addMessage = useCallback((role: "bot" | "user", content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        content,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // Derive bot state from route unless explicitly overridden
  let botState: BotState;
  if (botStateOverride) {
    botState = botStateOverride;
  } else if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) {
    botState = "hidden";
  } else if (pathname === "/") {
    botState = "welcome";
  } else if (pathname.startsWith("/sift")) {
    botState = "collapsed";
  } else {
    botState = "hidden";
  }

  const setBotState = useCallback((state: BotState) => {
    setBotStateOverride(state);
  }, []);

  // ESC exits edit mode. Quality-of-life: keyboard users shouldn't have to
  // hunt for the Done editing button.
  useEffect(() => {
    if (!editMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode]);

  return (
    <SiftBotContext.Provider
      value={{
        botState,
        setBotState,
        chatOpen,
        setChatOpen,
        messages,
        addMessage,
        currentUrl,
        setCurrentUrl,
        snapshotOpen,
        setSnapshotOpen,
        editFlags,
        setEditFlag,
        editMode,
        setEditMode,
        removedIds,
        removeId,
        addedIds,
        addId,
        removeAddedId,
        restoreAllIds,
        setEditState,
        siftedContext,
        setSiftedContext,
      }}
    >
      {children}
    </SiftBotContext.Provider>
  );
}
