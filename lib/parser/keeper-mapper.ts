import { parseHTML } from "linkedom";

/**
 * Given the HTML output from Readability, returns the data-sift-id values
 * of every element that survived. Used to build SiftResult.keeperSelectors,
 * which the client uses to map sifted content back to snapshot DOM nodes.
 */
export function extractKeeperIds(articleHtml: string): string[] {
  if (!articleHtml) return [];
  const { document } = parseHTML(`<div>${articleHtml}</div>`);
  const tagged = document.querySelectorAll("[data-sift-id]");
  const ids: string[] = [];
  for (const el of Array.from(tagged)) {
    const id = el.getAttribute("data-sift-id");
    if (id !== null && id !== "") {
      ids.push(id);
    }
  }
  return ids;
}
