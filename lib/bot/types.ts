export type BotState = "hidden" | "welcome" | "working" | "collapsed";

export interface ChatMessage {
  id: string;
  role: "bot" | "user";
  content: string;
  timestamp: number;
}

export interface ChatAction {
  type: "filter" | "extract" | "re-sift" | "adjust" | "none";
  params?: Record<string, unknown>;
}

export interface ChatResponse {
  reply: string;
  action?: ChatAction;
}

export interface SiftBotContextType {
  botState: BotState;
  setBotState: (state: BotState) => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  messages: ChatMessage[];
  addMessage: (role: "bot" | "user", content: string) => void;
  currentUrl: string | null;
  setCurrentUrl: (url: string | null) => void;
}
