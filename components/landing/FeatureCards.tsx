const features = [
  { icon: "🧹", title: "De-clutter", desc: "Strips ads, popups, life stories, and filler content" },
  { icon: "🔍", title: "Extract", desc: "Pulls out the actual content, recipes, and media you came for" },
  { icon: "🤖", title: "AI Detect", desc: "Scores content for AI-generated patterns with a confidence rating" },
];

export function FeatureCards() {
  return (
    <div className="flex gap-8 max-w-2xl mx-auto mt-8">
      {features.map((f) => (
        <div key={f.title} className="flex-1 text-center py-5 px-4">
          <div className="text-3xl mb-2">{f.icon}</div>
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">{f.title}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{f.desc}</div>
        </div>
      ))}
    </div>
  );
}
