"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      aria-label="Print this page"
      title="Print this page"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.32 0H6.34m0 0-1.4-7a48.108 48.108 0 0 1 14.12 0l-1.4 7m-12.32 0a4.5 4.5 0 0 1-.96-.116M3.91 11.038a48.13 48.13 0 0 1 16.18 0m-16.18 0a8.962 8.962 0 0 0-1.34.196m17.52-.196c.46.058.91.124 1.34.196M5.879 6.171V3.875c0-.621.504-1.125 1.125-1.125h9.992c.621 0 1.125.504 1.125 1.125v2.296M5.879 6.171a48.79 48.79 0 0 1 12.242 0M5.879 6.171c-.443.058-.882.121-1.317.19M18.121 6.171a48.79 48.79 0 0 1 1.317.19"
        />
      </svg>
    </button>
  );
}
