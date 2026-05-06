interface QuickActionsProps {
  onAction: (action: string) => void;
  editMode: boolean;
  hasEdits: boolean;
}

export function QuickActions({ onAction, editMode, hasEdits }: QuickActionsProps) {
  const actions = [
    { id: "edit", label: editMode ? "Done editing" : "Edit", primary: editMode },
    hasEdits ? { id: "restore", label: "Restore all", primary: false } : null,
    { id: "original", label: editMode ? "Add back items" : "Show original", primary: false },
    { id: "re-sift", label: "Re-sift", primary: false },
  ].filter((a): a is { id: string; label: string; primary: boolean } => a !== null);

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          className={
            action.primary
              ? "min-h-9 px-3 py-1.5 text-xs font-medium rounded-full bg-sift-gold text-white hover:bg-sift-gold-dark transition-colors cursor-pointer"
              : "min-h-9 px-3 py-1.5 text-xs font-medium rounded-full border border-border-light dark:border-border-dark text-gray-600 dark:text-gray-400 hover:border-sift-gold hover:text-sift-gold dark:hover:border-sift-gold-light dark:hover:text-sift-gold-light transition-colors cursor-pointer"
          }
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
