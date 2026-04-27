import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { extractMeta } from "./meta-extractor";
import { fetchUrl } from "./fetcher";
import { cleanupContent } from "./cleanup";
import { extractRecipe, recipeToHtml, RecipeData } from "./recipe-extractor";
import { cleanTitle, pickBestTitle } from "./title-cleaner";
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

  const { document: doc } = parseHTML(fetched.html);
  const meta = extractMeta(doc as unknown as Document, fetched.url);

  const rawTitleTag =
    doc.querySelector("title")?.textContent?.trim() || "";
  const rawOgTitle =
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() || "";

  const recipe = extractRecipe(fetched.html);

  const { document: readerDoc } = parseHTML(fetched.html);
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
  };
}
