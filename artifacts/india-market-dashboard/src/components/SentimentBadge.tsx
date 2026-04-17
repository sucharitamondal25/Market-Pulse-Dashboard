interface SentimentBadgeProps {
  sentiment: string;
  size?: "xs" | "sm";
}

const sentimentMap: Record<string, string> = {
  "Bullish": "badge-green",
  "Strong": "badge-green",
  "Healthy": "badge-green",
  "Buying": "badge-green",
  "Positive": "badge-green",
  "Confirming": "badge-green",
  "Leading": "badge-green",
  "Broad": "badge-green",
  "Risk-On": "badge-green",
  "Uptrend": "badge-green",
  "Trending": "badge-green",
  "Conviction": "badge-green",
  "Support": "badge-green",
  "Holding": "badge-green",
  "Low Vol": "badge-blue",
  "Normal": "badge-blue",
  "Neutral": "badge-blue",
  "Stable": "badge-blue",
  "Hold": "badge-blue",
  "Moderate": "badge-blue",
  "Weak": "badge-yellow",
  "Selective": "badge-yellow",
  "Lagging": "badge-yellow",
  "Bearish": "badge-red",
  "Selling": "badge-red",
  "Negative": "badge-red",
  "Failing": "badge-red",
};

export function SentimentBadge({ sentiment, size = "xs" }: SentimentBadgeProps) {
  const cls = sentimentMap[sentiment] ?? "badge-gray";
  const textSize = size === "xs" ? "text-[9px]" : "text-[10px]";
  return (
    <span className={`${cls} ${textSize} px-1.5 py-0.5 rounded font-medium font-mono uppercase tracking-wider`}>
      {sentiment}
    </span>
  );
}
