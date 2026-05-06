import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { EditManifestEntry } from "@/lib/parser/types";

export const runtime = "nodejs";

interface ChatRequestBody {
  message: string;
  articleTitle: string;
  editManifest: EditManifestEntry[];
  state: {
    hideImages: boolean;
    editMode: boolean;
    removedIds: string[];
  };
}

export type ChatActionType =
  | "hide-images"
  | "show-images"
  | "enter-edit-mode"
  | "exit-edit-mode"
  | "restore-all"
  | "remove-elements"
  | "add-elements"
  | "show-original"
  | "none";

export interface ChatAction {
  type: ChatActionType;
  ids?: string[];
}

export interface ChatResponse {
  reply: string;
  action: ChatAction;
}

const SYSTEM_PROMPT = `You are BitSift Bot, a tiny in-page assistant that helps users adjust a sifted (de-cluttered) article view. The user is reading the article and may ask you to change what's shown.

You have a fixed set of tools, one per action you can take. Always respond by calling exactly one tool. Each tool takes a "reply" string — your short, plain-language confirmation to the user (one sentence, conversational, no preamble like "Sure!" or "I'll").

Available actions:
- hide_images: hide every image, picture, figure, and svg in the article
- show_images: bring images back after they were hidden
- enter_edit_mode: turn on tap-to-remove (user can click any element to hide it)
- exit_edit_mode: turn off tap-to-remove
- restore_all: bring back every individually-removed element (does NOT affect hide_images)
- remove_elements: hide specific elements by their data-sift-id (you'll get a list of available ids in the edit manifest — pick the ones that match what the user described)
- restore_elements: un-remove specific elements that were previously removed. Only valid for ids currently in the "individually removed" state list. Use when the user says things like "put the byline back" or "actually keep the third paragraph".
- show_original: switch from the sifted view to the original page snapshot
- respond_only: just reply with text, no action — use this for off-topic questions, clarifications, or "what can you do" questions

Rules:
- If the request is ambiguous (e.g. "remove the third one" with no context), use respond_only to ask which one
- If the user asks for something off-topic (random questions, jokes, weather), respond_only with a brief redirect like "I can help adjust the sifted view — try 'no images' or 'remove the byline'"
- For remove_elements: only pick ids that exist in the manifest. If nothing matches, use respond_only to say so.
- Be aware of current state: don't say "done" if the action is already in that state — acknowledge that politely
- Keep replies under 20 words. Use straight quotes only.`;

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "hide_images",
    description: "Hide every image, picture, figure, and svg in the article.",
    input_schema: {
      type: "object",
      properties: {
        reply: { type: "string", description: "Short user-facing confirmation." },
      },
      required: ["reply"],
    },
  },
  {
    name: "show_images",
    description: "Bring back images after they were hidden via hide_images.",
    input_schema: {
      type: "object",
      properties: { reply: { type: "string" } },
      required: ["reply"],
    },
  },
  {
    name: "enter_edit_mode",
    description: "Turn on tap-to-remove edit mode so the user can click elements to hide them.",
    input_schema: {
      type: "object",
      properties: { reply: { type: "string" } },
      required: ["reply"],
    },
  },
  {
    name: "exit_edit_mode",
    description: "Turn off tap-to-remove edit mode.",
    input_schema: {
      type: "object",
      properties: { reply: { type: "string" } },
      required: ["reply"],
    },
  },
  {
    name: "restore_all",
    description: "Bring back every individually-removed element. Does not affect the hide_images toggle.",
    input_schema: {
      type: "object",
      properties: { reply: { type: "string" } },
      required: ["reply"],
    },
  },
  {
    name: "remove_elements",
    description: "Hide specific block elements by their data-sift-id values. Use the edit manifest to pick matching ids.",
    input_schema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description: "data-sift-id values from the edit manifest. Must match exactly.",
        },
        reply: { type: "string", description: "Short user-facing confirmation." },
      },
      required: ["ids", "reply"],
    },
  },
  {
    name: "restore_elements",
    description: "Un-remove specific elements that were previously removed (i.e. ids currently in the 'individually removed' list). The opposite of remove_elements. Use this when the user wants to put something back that they removed earlier.",
    input_schema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description: "data-sift-id values that are currently in the removed list. Must match exactly.",
        },
        reply: { type: "string", description: "Short user-facing confirmation." },
      },
      required: ["ids", "reply"],
    },
  },
  {
    name: "show_original",
    description: "Switch from the sifted (cleaned) view to the original page snapshot in an iframe.",
    input_schema: {
      type: "object",
      properties: { reply: { type: "string" } },
      required: ["reply"],
    },
  },
  {
    name: "respond_only",
    description: "No action — just reply with text. Use for off-topic questions, clarification requests, or capability questions.",
    input_schema: {
      type: "object",
      properties: { reply: { type: "string" } },
      required: ["reply"],
    },
  },
];

function manifestToText(entries: EditManifestEntry[]): string {
  if (!entries.length) return "(no targetable elements)";
  return entries.map((e) => `${e.id} <${e.tag}> ${e.label}`).join("\n");
}

function buildUserMessage(body: ChatRequestBody): string {
  const { hideImages, editMode, removedIds } = body.state;
  const stateLines = [
    `images: ${hideImages ? "hidden" : "showing"}`,
    `edit mode: ${editMode ? "on" : "off"}`,
    `individually removed: ${removedIds.length === 0 ? "none" : removedIds.join(", ")}`,
  ];
  return [
    `Article title: ${body.articleTitle || "(untitled)"}`,
    "",
    "Current state:",
    stateLines.map((l) => `- ${l}`).join("\n"),
    "",
    "Edit manifest (id <tag> label):",
    manifestToText(body.editManifest),
    "",
    `User said: "${body.message}"`,
  ].join("\n");
}

function toolUseToAction(name: string, input: Record<string, unknown>): { reply: string; action: ChatAction } {
  const reply = typeof input.reply === "string" ? input.reply : "";
  switch (name) {
    case "hide_images": return { reply, action: { type: "hide-images" } };
    case "show_images": return { reply, action: { type: "show-images" } };
    case "enter_edit_mode": return { reply, action: { type: "enter-edit-mode" } };
    case "exit_edit_mode": return { reply, action: { type: "exit-edit-mode" } };
    case "restore_all": return { reply, action: { type: "restore-all" } };
    case "show_original": return { reply, action: { type: "show-original" } };
    case "remove_elements": {
      const ids = Array.isArray(input.ids) ? (input.ids as unknown[]).filter((x): x is string => typeof x === "string") : [];
      return { reply, action: { type: "remove-elements", ids } };
    }
    case "restore_elements": {
      const ids = Array.isArray(input.ids) ? (input.ids as unknown[]).filter((x): x is string => typeof x === "string") : [];
      return { reply, action: { type: "add-elements", ids } };
    }
    case "respond_only":
    default:
      return { reply, action: { type: "none" } };
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      tools: TOOLS,
      tool_choice: { type: "any", disable_parallel_tool_use: true },
      messages: [{ role: "user", content: buildUserMessage(body) }],
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use") as Anthropic.Messages.ToolUseBlock | undefined;
    if (!toolBlock) {
      return NextResponse.json<ChatResponse>({
        reply: "Sorry, I couldn't figure that one out. Try rephrasing?",
        action: { type: "none" },
      });
    }

    const result = toolUseToAction(toolBlock.name, toolBlock.input as Record<string, unknown>);
    return NextResponse.json<ChatResponse>(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Too many requests, try again in a moment." }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
