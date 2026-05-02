"use client";

import { useEffect, useRef, useState } from "react";

export interface SnapshotIframeProps {
  html: string | null;
  onClose: () => void;
}

export function SnapshotIframe({ html, onClose }: SnapshotIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!html) {
      setBlobUrl(null);
      return;
    }
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [html]);

  if (!html) return null;

  return (
    <div className="fixed inset-0 z-40 bg-surface-light dark:bg-surface-dark flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Showing the original page
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-bold bg-sift-gold text-white rounded-lg cursor-pointer hover:bg-sift-gold-dark"
        >
          Back to sifted
        </button>
      </div>
      {blobUrl && (
        <iframe
          ref={iframeRef}
          src={blobUrl}
          sandbox="allow-same-origin"
          className="flex-1 w-full border-0"
          title="Original page snapshot"
        />
      )}
    </div>
  );
}
