export type ParsedCommand =
  | { type: "hide-images" }
  | { type: "show-images" }
  | { type: "edit-on" }
  | { type: "edit-off" }
  | { type: "restore-all" }
  | { type: "unknown" };

const IMAGE_NOUN = "(images?|pictures?|pics?|photos?|photographs?|imagery)";

const HIDE_IMAGE_PATTERNS: RegExp[] = [
  new RegExp(`^(no|hide|remove|drop|kill|strip|ditch|lose|get rid of|without)\\s+(the\\s+|all\\s+(the\\s+)?)?${IMAGE_NOUN}\\b`, "i"),
  new RegExp(`^${IMAGE_NOUN}\\s+(off|gone|away)\\b`, "i"),
  new RegExp(`^turn off\\s+(the\\s+|all\\s+(the\\s+)?)?${IMAGE_NOUN}\\b`, "i"),
];

const SHOW_IMAGE_PATTERNS: RegExp[] = [
  new RegExp(`^(show|bring back|put back|restore|add( back)?|return)\\s+(the\\s+|all\\s+(the\\s+)?)?${IMAGE_NOUN}\\b`, "i"),
  new RegExp(`^${IMAGE_NOUN}\\s+(back|on)\\b`, "i"),
  new RegExp(`^turn on\\s+(the\\s+|all\\s+(the\\s+)?)?${IMAGE_NOUN}\\b`, "i"),
];

const EDIT_ON_PATTERNS: RegExp[] = [
  /^(edit|edit mode|enter edit|start edit(ing)?|let me edit|let me clean( this)? up)\b/i,
  /^(turn on|enable|start)\s+edit(ing| mode)?\b/i,
];

const EDIT_OFF_PATTERNS: RegExp[] = [
  /^(done|done editing|stop edit(ing)?|exit edit( mode)?|finish( editing)?|i'?m done)\b/i,
  /^(turn off|disable|end)\s+edit(ing| mode)?\b/i,
];

const RESTORE_ALL_PATTERNS: RegExp[] = [
  /^(restore|undo|reset|put( it| them)? back|bring( it| them)? back)\s*(all|everything)?\b/i,
  /^(show|bring back|restore)\s+(all|everything)\b/i,
  /^undo all\b/i,
];

export function parseCommand(input: string): ParsedCommand {
  const text = input.trim().replace(/[.!?]+$/, "");
  if (!text) return { type: "unknown" };

  // Order matters: check more-specific image patterns before generic restore-all,
  // and edit-off before edit-on (so "stop editing" doesn't match "start editing").
  for (const pattern of HIDE_IMAGE_PATTERNS) {
    if (pattern.test(text)) return { type: "hide-images" };
  }
  for (const pattern of SHOW_IMAGE_PATTERNS) {
    if (pattern.test(text)) return { type: "show-images" };
  }
  for (const pattern of EDIT_OFF_PATTERNS) {
    if (pattern.test(text)) return { type: "edit-off" };
  }
  for (const pattern of EDIT_ON_PATTERNS) {
    if (pattern.test(text)) return { type: "edit-on" };
  }
  for (const pattern of RESTORE_ALL_PATTERNS) {
    if (pattern.test(text)) return { type: "restore-all" };
  }
  return { type: "unknown" };
}
