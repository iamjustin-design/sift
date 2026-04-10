interface BotAvatarProps {
  size?: number;
  className?: string;
}

export function BotAvatar({ size = 72, className = "" }: BotAvatarProps) {
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-sift-gold-light to-sift-gold flex items-center justify-center shadow-lg ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sieve bowl */}
        <ellipse cx="60" cy="50" rx="38" ry="22" stroke="currentColor" strokeWidth="5" className="text-surface-dark dark:text-surface-light" />
        <path d="M 22 50 Q 30 85 60 90 Q 90 85 98 50" stroke="currentColor" strokeWidth="5" fill="none" className="text-surface-dark dark:text-surface-light" />
        {/* Sieve holes */}
        <circle cx="45" cy="65" r="2.5" fill="currentColor" className="text-surface-dark dark:text-surface-light" opacity="0.3" />
        <circle cx="55" cy="72" r="2.5" fill="currentColor" className="text-surface-dark dark:text-surface-light" opacity="0.3" />
        <circle cx="65" cy="68" r="2.5" fill="currentColor" className="text-surface-dark dark:text-surface-light" opacity="0.3" />
        <circle cx="75" cy="63" r="2.5" fill="currentColor" className="text-surface-dark dark:text-surface-light" opacity="0.3" />
        {/* Eyes */}
        <circle cx="48" cy="46" r="5" fill="currentColor" className="text-surface-dark dark:text-surface-light" />
        <circle cx="68" cy="46" r="5" fill="currentColor" className="text-surface-dark dark:text-surface-light" />
        <circle cx="50" cy="44" r="1.5" fill="currentColor" className="text-sift-gold" />
        <circle cx="70" cy="44" r="1.5" fill="currentColor" className="text-sift-gold" />
        {/* Smile */}
        <path d="M 50 54 Q 58 62 66 54" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" className="text-surface-dark dark:text-surface-light" />
      </svg>
    </div>
  );
}
