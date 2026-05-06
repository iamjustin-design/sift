"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { SiftResult, SiftError } from "@/lib/parser/types";
import { useSiftBot } from "@/lib/bot/context";
import { projectFromSnapshot } from "@/lib/projection";
import { getSkipAnim, setSkipAnim, loadEdits, saveEdits } from "@/lib/persistence";
import { SourceBar } from "@/components/result/SourceBar";
import { ArticleBody } from "@/components/result/ArticleBody";
import { PrintButton } from "@/components/result/PrintButton";
import { SkipAnimationPill } from "@/components/result/SkipAnimationPill";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";
import { SnapshotIframe } from "@/components/animation/SnapshotIframe";
import { BotAvatar } from "@/components/bot/BotAvatar";
import Link from "next/link";

const LOADING_LINES = [
  "Fetching the page...",
  "Looking for the good stuff...",
  "Sifting bits from bytes...",
  "Almost there...",
];

function LoadingScreen({ url }: { url: string | null }) {
  const [lineIdx, setLineIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setLineIdx((i) => Math.min(i + 1, LOADING_LINES.length - 1)), 1500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark px-5">
      <div className="flex items-end gap-4 mb-2">
        <span className="block animate-bot-bob">
          <BotAvatar size={64} />
        </span>
        <div className="relative bg-surface-light-card dark:bg-surface-dark-card border border-border-light dark:border-border-dark rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 shadow-sm min-w-[200px]">
          {LOADING_LINES[lineIdx]}
        </div>
      </div>
      {url && (
        <p className="mt-6 text-xs text-gray-400 dark:text-gray-600 max-w-md truncate px-4">{url}</p>
      )}
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  // Rephrase common errors in the bot's voice. The raw error.code from the
  // server is short and serves as a key here.
  const friendly = (() => {
    const m = message.toLowerCase();
    if (m.includes("no url provided") || m.includes("url is required")) return "I need a URL to sift! Paste one on the home page.";
    if (m.includes("invalid_url") || m.includes("invalid url")) return "That URL doesn't look right to me. Mind double-checking it?";
    if (m.includes("fetch_failed") || m.includes("fetch failed")) return "I couldn't reach that page — the site might be down or blocking me.";
    if (m.includes("timeout")) return "That took too long. The site might be slow today — want to try again?";
    if (m.includes("parse_failed") || m.includes("parse failed")) return "I fetched the page, but I couldn't find a clear article inside. It might be a homepage or a thin stub.";
    if (m.includes("network error")) return "Network hiccup — please try again.";
    return `Something went sideways: ${message}`;
  })();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark px-5">
      <div className="flex items-end gap-4 mb-6 max-w-md">
        <span className="block">
          <BotAvatar size={64} />
        </span>
        <div className="relative bg-surface-light-card dark:bg-surface-dark-card border border-border-light dark:border-border-dark rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-700 dark:text-gray-300 shadow-sm">
          {friendly}
        </div>
      </div>
      <Link
        href="/"
        className="inline-block min-h-10 px-6 py-2.5 bg-sift-gold text-white rounded-lg font-medium hover:bg-sift-gold-dark transition-colors"
      >
        Try another URL
      </Link>
    </div>
  );
}

function SiftContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const [result, setResult] = useState<SiftResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { setBotState, setCurrentUrl, addMessage, messages, snapshotOpen, setSnapshotOpen, editFlags, editMode, removedIds, removeId, addedIds, addId, removeAddedId, setSiftedContext, setEditState } = useSiftBot();
  const [snapshotHtml, setSnapshotHtml] = useState<string | null>(null);
  // PBS2 — extraction animation phase: loading → animating → fading → done.
  // 'loading'   : /api/sift not yet returned (or snapshot not yet ready & still in grace window)
  // 'animating' : iframe overlay playing the keep / dim / dissolve sequence
  // 'fading'    : animation complete, iframe cross-fading out
  // 'done'      : article visible, no overlay
  type AnimPhase = "loading" | "animating" | "fading" | "done";
  const [animPhase, setAnimPhase] = useState<AnimPhase>("loading");
  // Slice B — user preference for skipping the extraction animation.
  // null = haven't been asked yet; we'll show the SkipAnimationPill after
  // the first run completes.
  const [skipAnimPref, setSkipAnimPrefState] = useState<boolean | null>(null);
  const [animationRan, setAnimationRan] = useState(false);
  const [pillDismissed, setPillDismissed] = useState(false);

  // Read preference once on mount (client-only).
  useEffect(() => {
    setSkipAnimPrefState(getSkipAnim());
  }, []);

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
        setSiftedContext({
          title: data.meta.title,
          editManifest: data.editManifest || [],
        });
        if (messages.length === 0) {
          addMessage("bot", "Here's your sifted content! Ask me to adjust anything.");
        }
      } catch {
        setError("Network error — please try again");
      } finally {
        setLoading(false);
      }
    };

    const fetchSnapshot = async () => {
      try {
        const res = await fetch("/api/sift/snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) return;
        const data: { html: string } = await res.json();
        setSnapshotHtml(data.html);
      } catch {
        // Snapshot is non-critical; ignore failures silently in v1.
      }
    };

    fetchSift();
    fetchSnapshot();
  }, [url]);

  // When the user has added back snapshot elements, re-project the article
  // content so the new elements actually appear. With no adds, fall back to
  // the original cleaned content (preserves Readability's structure).
  // NOTE: this hook + the callback below must run on every render — keep them
  // ABOVE any early returns (Rules of Hooks).
  const projectedContent = useMemo(() => {
    if (!result) return "";
    if (addedIds.length === 0 || !snapshotHtml) return result.content;
    const include = new Set<string>(result.keeperSelectors);
    addedIds.forEach((id) => include.add(id));
    removedIds.forEach((id) => include.delete(id));
    return projectFromSnapshot(snapshotHtml, include) || result.content;
  }, [result, snapshotHtml, addedIds, removedIds]);

  const handleSnapshotToggle = useCallback(
    (id: string, currentlyKept: boolean) => {
      if (currentlyKept) removeId(id);
      else addId(id);
    },
    [addId, removeId]
  );

  // Decide animation strategy once /api/sift returns.
  // - If user opted out of animations: jump straight to 'done'
  // - If snapshot is ready: play the animation
  // - Else: short grace window, then give up
  useEffect(() => {
    if (!result || animPhase !== "loading") return;
    if (skipAnimPref === true) {
      setAnimPhase("done");
      return;
    }
    if (snapshotHtml) {
      setAnimPhase("animating");
      setAnimationRan(true);
      return;
    }
    const timer = setTimeout(() => {
      setAnimPhase((p) => (p === "loading" ? "done" : p));
    }, 1500);
    return () => clearTimeout(timer);
  }, [result, snapshotHtml, animPhase, skipAnimPref]);

  const handleAnimDone = useCallback(() => {
    setAnimPhase("fading");
    // Match the iframe wrapper's CSS opacity transition (500ms).
    setTimeout(() => setAnimPhase("done"), 500);
  }, []);

  // Slice B — restore + autosave per-URL edit state in localStorage.
  // Combined into one effect so the restore on first sight of a sourceUrl
  // happens BEFORE the save can fire on subsequent state changes.
  const sourceUrl = result?.sourceUrl || "";
  const lastRestoredUrl = useRef<string | null>(null);
  const lastSavedSig = useRef<string | null>(null);
  useEffect(() => {
    if (!sourceUrl) return;

    if (lastRestoredUrl.current !== sourceUrl) {
      lastRestoredUrl.current = sourceUrl;
      const persisted = loadEdits(sourceUrl);
      if (persisted) setEditState(persisted);
      // Seed lastSavedSig with the just-restored shape so the immediate
      // re-fire of this effect (caused by setEditState updating state)
      // doesn't write the same data back to disk.
      lastSavedSig.current = JSON.stringify({
        hideImages: !!persisted?.hideImages,
        removedIds: persisted?.removedIds || [],
        addedIds: persisted?.addedIds || [],
      });
      return;
    }

    const sig = JSON.stringify({
      hideImages: editFlags.hideImages,
      removedIds,
      addedIds,
    });
    if (sig === lastSavedSig.current) return;
    lastSavedSig.current = sig;
    saveEdits(sourceUrl, {
      hideImages: editFlags.hideImages,
      removedIds,
      addedIds,
    });
  }, [sourceUrl, editFlags.hideImages, removedIds, addedIds, setEditState]);

  const handleSkipChoice = useCallback((skip: boolean) => {
    setSkipAnim(skip);
    setSkipAnimPrefState(skip);
    setPillDismissed(true);
  }, []);

  // Show loading while /api/sift is still in flight, OR after sift returns
  // but we're still waiting for the snapshot to start the animation. The
  // grace-window timeout above prevents the second case from hanging forever.
  if (loading || (animPhase === "loading" && !error)) {
    return <LoadingScreen url={url} />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  if (!result) return null;

  // While the animation is still running, hide the article underneath so the
  // cross-fade has something to fade INTO. Once we enter 'fading' or 'done',
  // smoothly bring the article up.
  const articleRevealed = animPhase === "fading" || animPhase === "done";

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      <div
        className={`max-w-4xl mx-auto px-5 py-8 transition-[opacity,transform] duration-500 ease-out ${
          articleRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link href="/" className="text-sift-gold hover:text-sift-gold-dark font-semibold text-sm flex items-center gap-1">
            <span>&larr;</span> BitSift
          </Link>
          <div className="flex items-center gap-2">
            <PrintButton />
            <UserMenu />
            <ThemeToggle />
          </div>
        </div>
        {animationRan && animPhase === "done" && skipAnimPref === null && !pillDismissed && (
          <SkipAnimationPill onChoose={handleSkipChoice} />
        )}
        <SourceBar domain={result.sourceDomain} url={result.sourceUrl} siftedAt={result.siftedAt} fetchTimeMs={result.fetchTimeMs} />
        <ArticleBody
          title={result.meta.title}
          author={result.meta.author}
          publishedDate={result.meta.publishedDate}
          ogImage={result.meta.ogImage}
          content={projectedContent}
          wordCount={result.wordCount}
          className={editFlags.hideImages ? "sift-no-images" : ""}
          editMode={editMode}
          removedIds={removedIds}
          onElementRemove={removeId}
        />
      </div>
      {snapshotOpen && (
        <SnapshotIframe
          html={snapshotHtml}
          onClose={() => setSnapshotOpen(false)}
          editable={editMode}
          keepers={result.keeperSelectors}
          addedIds={addedIds}
          removedIds={removedIds}
          onToggle={handleSnapshotToggle}
        />
      )}
      {(animPhase === "animating" || animPhase === "fading") && snapshotHtml && (
        <SnapshotIframe
          html={snapshotHtml}
          animating
          keepers={result.keeperSelectors}
          onAnimationDone={handleAnimDone}
          fadingOut={animPhase === "fading"}
        />
      )}
    </div>
  );
}

export default function SiftPage() {
  return (
    <Suspense fallback={<LoadingScreen url={null} />}>
      <SiftContent />
    </Suspense>
  );
}
