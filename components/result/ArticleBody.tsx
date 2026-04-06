interface ArticleBodyProps {
  title: string;
  author: string;
  publishedDate: string;
  ogImage: string;
  content: string;
  wordCount: number;
}

export function ArticleBody({ title, author, publishedDate, ogImage, content, wordCount }: ArticleBodyProps) {
  const readTime = Math.max(1, Math.ceil(wordCount / 250));

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <article>
      <h1 className="text-4xl font-bold leading-tight text-gray-900 dark:text-gray-100 mb-3">{title}</h1>
      <div className="text-sm text-gray-400 dark:text-gray-500 mb-8">
        {author && <span>By {author}</span>}
        {author && publishedDate && <span> &bull; </span>}
        {publishedDate && <span>{formatDate(publishedDate)}</span>}
        <span> &bull; {readTime} min read</span>
      </div>
      {ogImage && (
        <div className="w-full mb-8 rounded-xl overflow-hidden">
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
