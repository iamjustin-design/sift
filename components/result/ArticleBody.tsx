"use client";

import { MouseEvent } from "react";

interface ArticleBodyProps {
  title: string;
  author: string;
  publishedDate: string;
  ogImage: string;
  content: string;
  wordCount: number;
  className?: string;
  editMode?: boolean;
  removedIds?: string[];
  onElementRemove?: (id: string) => void;
}

function buildHideRule(ids: string[]): string {
  if (ids.length === 0) return "";
  const sel = ids.map((id) => `[data-sift-id="${id.replace(/"/g, '\\"')}"]`).join(", ");
  return `${sel} { display: none !important; }`;
}

export function ArticleBody({
  title,
  author,
  publishedDate,
  ogImage,
  content,
  wordCount,
  className = "",
  editMode = false,
  removedIds = [],
  onElementRemove,
}: ArticleBodyProps) {
  const readTime = Math.max(1, Math.ceil(wordCount / 250));

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    if (!editMode || !onElementRemove) return;
    const target = e.target as HTMLElement;
    const sifted = target.closest("[data-sift-id]") as HTMLElement | null;
    if (!sifted) return;
    e.preventDefault();
    e.stopPropagation();
    const id = sifted.getAttribute("data-sift-id");
    if (id) onElementRemove(id);
  };

  const articleClass = [className, editMode ? "sift-edit-mode" : ""].filter(Boolean).join(" ");
  const hideRule = buildHideRule(removedIds);

  return (
    <article className={articleClass} onClick={handleClick}>
      {hideRule && <style>{hideRule}</style>}
      <h1 className="text-4xl font-bold leading-tight text-gray-900 dark:text-gray-100 mb-3">{title}</h1>
      <div className="text-sm text-gray-400 dark:text-gray-500 mb-8">
        {author && <span>By {author}</span>}
        {author && publishedDate && <span> &bull; </span>}
        {publishedDate && <span>{formatDate(publishedDate)}</span>}
        <span> &bull; {readTime} min read</span>
      </div>
      {ogImage && (
        <div className="article-hero-image w-full mb-8 rounded-xl overflow-hidden">
          <img src={ogImage} alt={title} className="w-full h-auto max-h-80 object-cover" />
        </div>
      )}
      <div
        className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-sift-gold prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </article>
  );
}
