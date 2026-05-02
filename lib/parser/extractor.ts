import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { extractMeta } from "./meta-extractor";
import { fetchUrl } from "./fetcher";
import { cleanupContent } from "./cleanup";
import { extractRecipe, recipeToHtml, RecipeData } from "./recipe-extractor";
import { cleanTitle, pickBestTitle } from "./title-cleaner";
import { tagBlockElements } from "./sift-tagger";
import { extractKeeperIds } from "./keeper-mapper";
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
  const titleCandidates = [
    recipe?.name || "",
    cleanTitle(rawTitleTag, meta.siteName, isRecipePage),
    cleanTitle(rawOgTitle, meta.siteName, isRecipePage),
    cleanTitle(article?.title || "", meta.siteName, isRecipePage),
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
  // keeperSelectors are empty for them. Sift Edits is non-recipe-only in v1.
  const keeperSelectors = recipe ? [] : extractKeeperIds(article!.content ?? "");

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
  };
}
