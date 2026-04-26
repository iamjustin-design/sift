"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import type { BotState, ChatMessage, SiftBotContextType } from "./types";

const SiftBotContext = createContext<SiftBotContextType>({
  botState: "welcome",
  setBotState: () => {},
  chatOpen: false,
  setChatOpen: () => {},
  messages: [],
  addMessage: () => {},
  currentUrl: null,
  setCurrentUrl: () => {},
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
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

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
      }}
    >
      {children}
    </SiftBotContext.Provider>
  );
}
