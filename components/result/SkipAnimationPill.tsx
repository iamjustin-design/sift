"use client";

interface SkipAnimationPillProps {
  onChoose: (skip: boolean) => void;
}

export function SkipAnimationPill({ onChoose }: SkipAnimationPillProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light-card dark:bg-surface-dark-card px-4 py-2.5 text-sm shadow-sm print:hidden">
      <span className="text-gray-600 dark:text-gray-400">
        Skip the sifting animation next time?
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onChoose(true)}
          className="min-h-9 px-3 py-1.5 text-xs font-bold rounded-full bg-sift-gold text-white hover:bg-sift-gold-dark cursor-pointer"
        >
          Yes, skip
        </button>
        <button
          onClick={() => onChoose(false)}
          className="min-h-9 px-3 py-1.5 text-xs font-medium rounded-full border border-border-light dark:border-border-dark text-gray-600 dark:text-gray-400 hover:border-sift-gold hover:text-sift-gold cursor-pointer"
        >
          No, keep it
        </button>
      </div>
    </div>
  );
}
