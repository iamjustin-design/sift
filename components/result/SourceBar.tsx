interface SourceBarProps {
  domain: string;
  url: string;
  siftedAt: string;
  fetchTimeMs: number;
}

export function SourceBar({ domain, url, siftedAt, fetchTimeMs }: SourceBarProps) {
  const timeAgo = () => {
    const diff = Date.now() - new Date(siftedAt).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  };

  return (
    <div className="flex items-center gap-2 py-3 mb-6 border-b border-border-light dark:border-border-dark text-xs text-gray-400 dark:text-gray-500">
      <span>Sifted from:</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sift-gold hover:underline">
        {domain}
      </a>
      <span className="ml-auto text-gray-300 dark:text-gray-600">
        {timeAgo()} &bull; {fetchTimeMs}ms
      </span>
    </div>
  );
}
