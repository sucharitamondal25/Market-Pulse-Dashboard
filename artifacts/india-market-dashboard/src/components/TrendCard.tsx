import { SentimentBadge } from "./SentimentBadge";
import type { TrendData } from "@/hooks/useDashboard";
import { trendData as mockTrend } from "@/data/marketData";

interface Props { data?: TrendData | null; }

export function TrendCard({ data }: Props) {
  const score = data?.score ?? 88;
  const color = score >= 70 ? "#00e676" : score >= 45 ? "#ffea00" : "#ff1744";
  const items = data?.items ?? mockTrend;

  return (
    <div className="card-dark rounded p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">〰️</span>
          <span className="section-header text-[#40c4ff]">Trend</span>
        </div>
        <span className="text-base font-bold font-mono" style={{ color }}>{score}</span>
      </div>
      <div className="h-px bg-border" />
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{item.label}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-foreground">{item.status}</span>
              <SentimentBadge sentiment={item.sentiment} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
