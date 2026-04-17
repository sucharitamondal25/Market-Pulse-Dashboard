import { macroData } from "@/data/marketData";
import { SentimentBadge } from "./SentimentBadge";

export function MacroCard({ score }: { score: number }) {
  const color = score >= 70 ? "#00e676" : score >= 45 ? "#ffea00" : "#ff1744";

  return (
    <div className="card-dark rounded p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">🌐</span>
          <span className="section-header text-[#40c4ff]">Macro</span>
        </div>
        <span className="text-base font-bold font-mono" style={{ color }}>{score}</span>
      </div>
      <div className="h-px bg-border" />
      <div className="flex flex-col gap-2">
        {macroData.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground shrink-0">{item.label}</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-mono text-foreground truncate">{item.value}</span>
              <SentimentBadge sentiment={item.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
