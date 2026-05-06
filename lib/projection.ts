/**
 * Client-side re-projection helper for Sift Edits.
 *
 * Given the original sanitized snapshot HTML and a set of include-ids
 * (= keepers ∪ added − removed), produces a new HTML string containing
 * only the matching tagged block elements in document order, with nested
 * duplicates collapsed to their outermost ancestor in the include set.
 *
 * Runs in the browser via DOMParser. Snapshot URLs and scripts are already
 * sanitized server-side, so this helper does no further cleanup.
 */
export function projectFromSnapshot(snapshotHtml: string, includeIds: Set<string>): string {
  if (!snapshotHtml || includeIds.size === 0) return "";

  const doc = new DOMParser().parseFromString(snapshotHtml, "text/html");
  const all = Array.from(doc.body?.querySelectorAll<HTMLElement>("[data-sift-id]") || []);

  // Collect surviving elements in document order, skipping nested ones whose
  // ancestor is also being included (avoids rendering the same node twice).
  const survivors: HTMLElement[] = [];
  for (const el of all) {
    const id = el.getAttribute("data-sift-id");
    if (!id || !includeIds.has(id)) continue;
    let nested = false;
    for (const other of all) {
      if (other === el) continue;
      const otherId = other.getAttribute("data-sift-id");
      if (!otherId || !includeIds.has(otherId)) continue;
      if (other.contains(el)) {
        nested = true;
        break;
      }
    }
    if (!nested) survivors.push(el);
  }

  const wrapper = doc.createElement("div");
  for (const el of survivors) {
    wrapper.appendChild(el.cloneNode(true));
  }
  return wrapper.innerHTML;
}
