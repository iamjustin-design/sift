"use client";

import { useEffect, useRef, useState } from "react";

export interface SnapshotIframeProps {
  html: string | null;
  onClose?: () => void;
  editable?: boolean;
  keepers?: string[];
  addedIds?: string[];
  removedIds?: string[];
  onToggle?: (id: string, currentlyKept: boolean) => void;
  // Animation mode (Phase B Slice 2): plays the keep / dim / dissolve sequence
  // and signals completion via onAnimationDone. Mutually exclusive with `editable`.
  animating?: boolean;
  onAnimationDone?: () => void;
  fadingOut?: boolean;
}

const EDIT_STYLE_BLOCK = `
<style id="__sift_edit_styles">
  html, body { background: #fff !important; }
  [data-sift-id] {
    transition: outline-color 0.12s, opacity 0.12s, background-color 0.12s;
    outline: 2px dashed transparent;
    outline-offset: 4px;
    cursor: pointer;
  }
  [data-sift-id]:not(.__sift-kept) {
    opacity: 0.45;
    outline-color: rgba(120, 120, 120, 0.55);
  }
  [data-sift-id].__sift-kept {
    outline-color: #b8860b;
    outline-style: solid;
    background-color: rgba(184, 134, 11, 0.06);
  }
  @media (hover: hover) {
    [data-sift-id]:not(.__sift-kept):hover {
      outline-color: #b8860b;
      opacity: 0.85;
      background-color: rgba(184, 134, 11, 0.08);
    }
    [data-sift-id].__sift-kept:hover {
      outline-color: #d4a017;
      background-color: rgba(184, 134, 11, 0.12);
    }
  }
  a, button, [role="button"] { pointer-events: none; }
  [data-sift-id] { pointer-events: auto; }
</style>
`;

const EDIT_SCRIPT_BLOCK = `
<script>
(function() {
  function applyState(state) {
    var kept = new Set();
    (state.keepers || []).forEach(function(id) { kept.add(String(id)); });
    (state.added || []).forEach(function(id) { kept.add(String(id)); });
    (state.removed || []).forEach(function(id) { kept.delete(String(id)); });
    document.querySelectorAll('[data-sift-id]').forEach(function(el) {
      var id = el.getAttribute('data-sift-id');
      if (kept.has(id)) el.classList.add('__sift-kept');
      else el.classList.remove('__sift-kept');
    });
  }

  document.addEventListener('click', function(e) {
    var el = e.target.closest && e.target.closest('[data-sift-id]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var id = el.getAttribute('data-sift-id');
    var currentlyKept = el.classList.contains('__sift-kept');
    parent.postMessage({ type: 'sift:toggle', id: id, currentlyKept: currentlyKept }, '*');
  }, true);

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'sift:state') applyState(e.data);
  });

  parent.postMessage({ type: 'sift:ready' }, '*');
})();
</script>
`;

const ANIM_STYLE_BLOCK = `
<style id="__sift_anim_styles">
  html, body { background: #fff !important; overflow: hidden !important; }
  body { pointer-events: none !important; }
  [data-sift-id] {
    transition: opacity 0.6s ease, outline-color 0.5s ease, background-color 0.5s ease;
  }
  [data-sift-id].__sift-anim-dim { opacity: 0.25; }
  [data-sift-id].__sift-anim-gone { opacity: 0; }
  [data-sift-id].__sift-anim-keep {
    outline: 3px solid #b8860b;
    outline-offset: 4px;
    background-color: rgba(184, 134, 11, 0.08);
    animation: __sift_keep_pulse 1.05s ease-out 1;
  }
  @keyframes __sift_keep_pulse {
    0%   { box-shadow: 0 0 0 0 rgba(184, 134, 11, 0); }
    35%  { box-shadow: 0 0 24px 6px rgba(184, 134, 11, 0.55); }
    100% { box-shadow: 0 0 0 0 rgba(184, 134, 11, 0); }
  }
</style>
`;

const ANIM_SCRIPT_BLOCK = `
<script>
(function() {
  function runAnimation(keepers) {
    var kept = {};
    (keepers || []).forEach(function(id) { kept[String(id)] = true; });
    var all = document.querySelectorAll('[data-sift-id]');

    // Phase 1 (300ms): pulse keepers, dim non-keepers
    setTimeout(function() {
      all.forEach(function(el) {
        var id = el.getAttribute('data-sift-id');
        if (kept[id]) el.classList.add('__sift-anim-keep');
        else el.classList.add('__sift-anim-dim');
      });
    }, 300);

    // Phase 2 (1300ms): fade non-keepers to 0
    setTimeout(function() {
      all.forEach(function(el) {
        var id = el.getAttribute('data-sift-id');
        if (!kept[id]) el.classList.add('__sift-anim-gone');
      });
    }, 1300);

    // Phase 3 (2400ms): tell parent we're done so it can cross-fade out.
    setTimeout(function() {
      parent.postMessage({ type: 'sift:animation-done' }, '*');
    }, 2400);
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'sift:animate' && Array.isArray(e.data.keepers)) {
      runAnimation(e.data.keepers);
    }
  });

  parent.postMessage({ type: 'sift:ready' }, '*');
})();
</script>
`;

function injectPayload(html: string, payload: string): string {
  const closeBody = html.lastIndexOf("</body>");
  if (closeBody === -1) return html + payload;
  return html.slice(0, closeBody) + payload + html.slice(closeBody);
}

function injectEditPayload(html: string): string {
  return injectPayload(html, EDIT_STYLE_BLOCK + EDIT_SCRIPT_BLOCK);
}

function injectAnimPayload(html: string): string {
  return injectPayload(html, ANIM_STYLE_BLOCK + ANIM_SCRIPT_BLOCK);
}

export function SnapshotIframe({
  html,
  onClose,
  editable = false,
  keepers = [],
  addedIds = [],
  removedIds = [],
  onToggle,
  animating = false,
  onAnimationDone,
  fadingOut = false,
}: SnapshotIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!html) {
      setBlobUrl(null);
      return;
    }
    let finalHtml = html;
    if (animating) finalHtml = injectAnimPayload(finalHtml);
    else if (editable) finalHtml = injectEditPayload(finalHtml);
    const blob = new Blob([finalHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [html, editable, animating]);

  // Editable: state push + click toggles
  useEffect(() => {
    if (!editable) return;
    const post = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "sift:state", keepers, added: addedIds, removed: removedIds },
        "*"
      );
    };
    const handler = (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (data.type === "sift:ready") {
        post();
        return;
      }
      if (data.type === "sift:toggle" && typeof data.id === "string" && onToggle) {
        onToggle(data.id, !!data.currentlyKept);
      }
    };
    window.addEventListener("message", handler);
    post();
    return () => window.removeEventListener("message", handler);
  }, [editable, keepers, addedIds, removedIds, onToggle]);

  // Animating: kick off the timeline once iframe is ready, listen for done.
  useEffect(() => {
    if (!animating) return;
    const startAnim = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "sift:animate", keepers },
        "*"
      );
    };
    const handler = (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (data.type === "sift:ready") {
        startAnim();
        return;
      }
      if (data.type === "sift:animation-done" && onAnimationDone) {
        onAnimationDone();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [animating, keepers, onAnimationDone]);

  if (!html) return null;

  const allowScripts = editable || animating;
  const sandbox = allowScripts
    ? "allow-same-origin allow-scripts"
    : "allow-same-origin";

  if (animating) {
    // Full-bleed overlay, no chrome. Cross-fades out via `fadingOut`.
    return (
      <div
        className={`fixed inset-0 z-40 bg-surface-light dark:bg-surface-dark print:hidden transition-opacity duration-500 ${
          fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {blobUrl && (
          <iframe
            ref={iframeRef}
            src={blobUrl}
            sandbox={sandbox}
            className="w-full h-full border-0"
            title="Sifting animation"
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-surface-light dark:bg-surface-dark flex flex-col print:hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark gap-3">
        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-3 min-w-0">
          <span className="truncate">
            {editable ? "Tap any ghosted item to add it back to the sifted view" : "Showing the original page"}
          </span>
          {editable && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs">
              <span className="inline-block w-3 h-3 rounded-sm border-2 border-solid border-sift-gold bg-sift-gold/10" />
              <span>kept</span>
              <span className="inline-block w-3 h-3 rounded-sm border-2 border-dashed border-gray-400 ml-2" />
              <span>not in sifted</span>
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold bg-sift-gold text-white rounded-lg cursor-pointer hover:bg-sift-gold-dark whitespace-nowrap"
          >
            {editable ? "Done editing" : "Back to sifted"}
          </button>
        )}
      </div>
      {blobUrl && (
        <iframe
          ref={iframeRef}
          src={blobUrl}
          sandbox={sandbox}
          className="flex-1 w-full border-0"
          title="Original page snapshot"
        />
      )}
    </div>
  );
}
