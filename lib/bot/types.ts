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

export interface EditFlags {
  hideImages: boolean;
}

export interface SiftedContext {
  title: string;
  editManifest: { id: string; tag: string; label: string }[];
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
  snapshotOpen: boolean;
  setSnapshotOpen: (open: boolean) => void;
  editFlags: EditFlags;
  setEditFlag: <K extends keyof EditFlags>(key: K, value: EditFlags[K]) => void;
  editMode: boolean;
  setEditMode: (open: boolean) => void;
  removedIds: string[];
  removeId: (id: string) => void;
  addedIds: string[];
  addId: (id: string) => void;
  removeAddedId: (id: string) => void;
  restoreAllIds: () => void;
  /** Batch-restore edit state (used to rehydrate from localStorage). */
  setEditState: (state: { hideImages?: boolean; removedIds?: string[]; addedIds?: string[] }) => void;
  siftedContext: SiftedContext | null;
  setSiftedContext: (ctx: SiftedContext | null) => void;
}
