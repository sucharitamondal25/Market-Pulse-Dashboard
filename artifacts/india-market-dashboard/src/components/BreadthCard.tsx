import { SentimentBadge } from "./SentimentBadge";
import type { BreadthData } from "@/hooks/useDashboard";
import { breadthData as mockBreadth } from "@/data/marketData";

interface Props { data?: BreadthData | null; }

export function BreadthCard({ data }: Props) {
  const score = data?.score ?? 65;
  const color = score >= 70 ? "#00e676" : score >= 45 ? "#ffea00" : "#ff1744";
  const items = data?.items ?? mockBreadth;

  return (
    <div className="card-dark rounded p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">📊</span>
          <span className="section-header text-[#ffea00]">Breadth</span>
        </div>
        <span className="text-base font-bold font-mono" style={{ color }}>{score}</span>
      </div>
      <div className="h-px bg-border" />
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground shrink-0">{item.label}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-semibold text-foreground">{item.value}</span>
              <SentimentBadge sentiment={item.sentiment} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
