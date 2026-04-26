interface QuickActionsProps {
  onAction: (action: string) => void;
}

const ACTIONS = [
  { id: "images", label: "Just images" },
  { id: "links", label: "Extract links" },
  { id: "original", label: "Show original" },
  { id: "re-sift", label: "Re-sift" },
];

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2">
      {ACTIONS.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          className="px-3 py-1 text-xs font-medium rounded-full border border-border-light dark:border-border-dark text-gray-600 dark:text-gray-400 hover:border-sift-gold hover:text-sift-gold dark:hover:border-sift-gold-light dark:hover:text-sift-gold-light transition-colors cursor-pointer"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
