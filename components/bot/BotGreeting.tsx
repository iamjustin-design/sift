"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BotAvatar } from "./BotAvatar";
import { useSiftBot } from "@/lib/bot/context";

export function BotGreeting() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setCurrentUrl, setBotState } = useSiftBot();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    setLoading(true);
    setCurrentUrl(cleanUrl);
    setBotState("working");
    router.push(`/sift?url=${encodeURIComponent(cleanUrl)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-5">
      {/* Mascot + speech bubble */}
      <div className="flex items-end gap-4 mb-8">
        <BotAvatar size={72} />
        <div className="relative bg-surface-light-card dark:bg-surface-dark-card border border-border-light dark:border-border-dark rounded-2xl rounded-bl-sm px-5 py-3 max-w-[280px] shadow-sm">
          <h1 className="text-sift-gold dark:text-sift-gold-light text-lg font-semibold">
            What can I sift for you today?
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Paste a URL and I&apos;ll extract the good stuff.
          </p>
        </div>
      </div>

      {/* URL input */}
      <form onSubmit={handleSubmit} className="w-full max-w-lg mb-6">
        <div className="flex bg-white dark:bg-gray-900 border-2 border-border-light dark:border-border-dark rounded-2xl p-1 focus-within:border-sift-gold dark:focus-within:border-sift-gold-light transition-colors">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a URL to sift..."
            className="flex-1 px-4 py-3 text-base bg-transparent text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 text-base font-bold bg-gradient-to-br from-sift-gold to-sift-gold-light text-white rounded-xl hover:from-sift-gold-dark hover:to-sift-gold tracking-wide transition-all disabled:opacity-50 disabled:cursor-wait cursor-pointer"
          >
            {loading ? "Sifting..." : "Sift It"}
          </button>
        </div>
      </form>

      {/* Feature hints */}
      <div className="flex gap-5 text-xs text-gray-400 dark:text-gray-500">
        <span>🧹 De-clutter</span>
        <span>🔍 Extract</span>
        <span>🤖 AI Detect</span>
      </div>
    </div>
  );
}
