"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export function UrlInput() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    setLoading(true);
    router.push(`/sift?url=${encodeURIComponent(cleanUrl)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto mb-6">
      <div className="flex">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a URL to sift..."
          className="flex-1 px-5 py-4 text-base border-2 border-border-light dark:border-border-dark border-r-0 rounded-l-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none focus:border-sift-gold dark:focus:border-sift-gold-light placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-4 text-base font-semibold bg-gradient-to-br from-sift-gold to-sift-gold-light text-white border-2 border-sift-gold rounded-r-xl hover:from-sift-gold-dark hover:to-sift-gold tracking-wide transition-all disabled:opacity-50 disabled:cursor-wait cursor-pointer"
        >
          {loading ? "Sifting..." : "Sift It"}
        </button>
      </div>
    </form>
  );
}
