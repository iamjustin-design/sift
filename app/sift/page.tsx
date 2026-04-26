"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { SiftResult, SiftError } from "@/lib/parser/types";
import { useSiftBot } from "@/lib/bot/context";
import { SourceBar } from "@/components/result/SourceBar";
import { ArticleBody } from "@/components/result/ArticleBody";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";
import Link from "next/link";

function SiftContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const [result, setResult] = useState<SiftResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { setBotState, setCurrentUrl, addMessage, messages } = useSiftBot();

  useEffect(() => {
    if (!url) { setError("No URL provided"); setLoading(false); return; }

    const fetchSift = async () => {
      try {
        const res = await fetch("/api/sift", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) {
          const err: SiftError = await res.json();
          setError(err.error || "Failed to sift this page");
          setLoading(false);
          return;
        }
        const data: SiftResult = await res.json();
        setResult(data);
        setBotState("collapsed");
        setCurrentUrl(url);
        if (messages.length === 0) {
          addMessage("bot", "Here's your sifted content! Ask me to adjust anything.");
        }
      } catch {
        setError("Network error — please try again");
      } finally {
        setLoading(false);
      }
    };

    fetchSift();
  }, [url]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-sift-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 dark:text-gray-400">Sifting content...</p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1 max-w-md truncate px-4">{url}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark px-5">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">😵</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Couldn&apos;t sift that</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <Link href="/" className="inline-block px-6 py-3 bg-sift-gold text-white rounded-lg font-medium hover:bg-sift-gold-dark transition-colors">
            Try another URL
          </Link>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      <div className="max-w-3xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-sift-gold hover:text-sift-gold-dark font-semibold text-sm flex items-center gap-1">
            <span>&larr;</span> BitSift
          </Link>
          <div className="flex items-center gap-2">
            <UserMenu />
            <ThemeToggle />
          </div>
        </div>
        <SourceBar domain={result.sourceDomain} url={result.sourceUrl} siftedAt={result.siftedAt} fetchTimeMs={result.fetchTimeMs} />
        <ArticleBody
          title={result.meta.title}
          author={result.meta.author}
          publishedDate={result.meta.publishedDate}
          ogImage={result.meta.ogImage}
          content={result.content}
          wordCount={result.wordCount}
        />
      </div>
    </div>
  );
}

export default function SiftPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
        <div className="w-12 h-12 border-4 border-sift-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SiftContent />
    </Suspense>
  );
}
