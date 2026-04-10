import { BotAvatar } from "./BotAvatar";
import type { ChatMessage as ChatMessageType } from "@/lib/bot/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.role === "bot";

  return (
    <div className={`flex gap-2 ${isBot ? "items-start" : "items-start flex-row-reverse"}`}>
      {isBot && <BotAvatar size={28} className="shrink-0 mt-0.5" />}
      <div
        className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
          isBot
            ? "bg-surface-light dark:bg-surface-dark text-gray-700 dark:text-gray-300 rounded-bl-sm"
            : "bg-sift-gold text-white rounded-br-sm"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
