import { parseHTML } from "linkedom";

const BLOCK_TAGS = new Set([
  "P",
  "H1", "H2", "H3", "H4", "H5", "H6",
  "UL", "OL",
  "BLOCKQUOTE",
  "PRE",
  "TABLE",
  "FIGURE",
  "IMG",
  "VIDEO",
  "AUDIO",
  "HR",
  "SECTION",
  "ARTICLE",
  "ASIDE",
]);

/**
 * Walks the document body in document order and assigns a sequential
 * data-sift-id attribute to every block-level content element.
 *
 * Both /api/sift and /api/sift/snapshot call this on the same fetched
 * HTML, producing identical IDs because traversal is deterministic.
 */
export function tagBlockElements(html: string): string {
  const { document } = parseHTML(html);
  const root = document.body || document.documentElement;
  if (!root) return html;

  let counter = 0;
  const walker = (node: Element) => {
    if (BLOCK_TAGS.has(node.tagName)) {
      node.setAttribute("data-sift-id", String(counter));
      counter += 1;
    }
    for (const child of Array.from(node.children)) {
      walker(child as Element);
    }
  };

  for (const child of Array.from(root.children)) {
    walker(child as Element);
  }

  return document.toString();
}
