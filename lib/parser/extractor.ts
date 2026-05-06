import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { extractMeta } from "./meta-extractor";
import { fetchUrl } from "./fetcher";
import { cleanupContent } from "./cleanup";
import { extractRecipe, recipeToHtml, RecipeData } from "./recipe-extractor";
import { cleanTitle, pickBestTitle } from "./title-cleaner";
import { tagBlockElements } from "./sift-tagger";
import { extractKeeperIds } from "./keeper-mapper";
import { buildEditManifest } from "./edit-manifest";
import { SiftResult } from "./types";

function recipeTextContent(recipe: RecipeData): string {
  const parts: string[] = [];
  if (recipe.description) parts.push(recipe.description);
  parts.push(...recipe.ingredients);
  for (const group of recipe.instructions) {
    if (group.heading) parts.push(group.heading);
    parts.push(...group.steps);
  }
  return parts.join("\n");
}

export async function siftUrl(url: string): Promise<SiftResult> {
  const fetched = await fetchUrl(url);

  // Tag once. Both downstream parses use the tagged HTML so data-sift-id
  // values are stable and survive Readability's DOM mutations.
  const taggedHtml = tagBlockElements(fetched.html);

  const { document: doc } = parseHTML(taggedHtml);
  const meta = extractMeta(doc as unknown as Document, fetched.url);

  const rawTitleTag =
    doc.querySelector("title")?.textContent?.trim() || "";
  const rawOgTitle =
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() || "";

  const recipe = extractRecipe(taggedHtml);

  const { document: readerDoc } = parseHTML(taggedHtml);
  const reader = new Readability(readerDoc as unknown as Document);
  const article = reader.parse();

  if (!recipe && !article) {
    throw new Error("PARSE_FAILED");
  }

  if (article) {
    if (!meta.author && article.byline) meta.author = article.byline;
    if (!meta.description && article.excerpt) meta.description = article.excerpt;
    if (article.siteName) meta.siteName = article.siteName;
  }

  if (recipe) {
    if (!meta.description && recipe.description) meta.description = recipe.description;
    if (!meta.author && recipe.author) meta.author = recipe.author;
  }

  const isRecipePage = !!recipe;
  // Site-name candidates for trailing-suffix stripping. og:site_name often
  // differs from the brand used in the <title> tag (e.g. Wikipedia uses
  // "Wikimedia Foundation, Inc." for og:site_name but "Wikipedia" in titles).
  // Also derive a brand from the hostname.
  const hostnameBrand = (() => {
    try {
      const host = new URL(fetched.url).hostname.replace(/^www\./, "");
      const parts = host.split(".");
      if (parts.length >= 2) {
        const root = parts[parts.length - 2];
        return root.charAt(0).toUpperCase() + root.slice(1);
      }
      return host;
    } catch {
      return "";
    }
  })();
  const siteNameCandidates = [meta.siteName, hostnameBrand].filter((s): s is string => !!s);

  const titleCandidates = [
    recipe?.name || "",
    cleanTitle(rawTitleTag, siteNameCandidates, isRecipePage),
    cleanTitle(rawOgTitle, siteNameCandidates, isRecipePage),
    cleanTitle(article?.title || "", siteNameCandidates, isRecipePage),
  ];
  meta.title = pickBestTitle(titleCandidates) || meta.title;

  let content: string;
  let textContent: string;

  if (recipe) {
    content = recipeToHtml(recipe);
    textContent = recipeTextContent(recipe);
  } else {
    content = cleanupContent(article!.content ?? "", fetched.url, meta.title);
    textContent = article!.textContent ?? "";
  }

  let sourceDomain = "";
  try {
    sourceDomain = new URL(fetched.url).hostname.replace(/^www\./, "");
  } catch {
    sourceDomain = "";
  }

  const wordCount = textContent
    ? textContent.split(/\s+/).filter((w) => w.length > 0).length
    : 0;

  // Recipe pages produce synthetic HTML with no data-sift-id values, so the
  // keeperSelectors and editManifest are empty for them. Sift Edits is
  // non-recipe-only in v1.
  const keeperSelectors = recipe ? [] : extractKeeperIds(article!.content ?? "");
  const editManifest = recipe ? [] : buildEditManifest(content);

  return {
    meta,
    content,
    textContent,
    excerpt: (article?.excerpt) || meta.description || recipe?.description || "",
    wordCount,
    sourceUrl: fetched.url,
    sourceDomain,
    siftedAt: new Date().toISOString(),
    fetchTimeMs: fetched.fetchTimeMs,
    keeperSelectors,
    editManifest,
  };
}
