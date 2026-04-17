import { breadthData } from "@/data/marketData";
import { SentimentBadge } from "./SentimentBadge";

export function BreadthCard({ score }: { score: number }) {
  const color = score >= 70 ? "#00e676" : score >= 45 ? "#ffea00" : "#ff1744";

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
        {breadthData.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-semibold text-foreground">{item.value}</span>
                <SentimentBadge sentiment={item.sentiment} />
              </div>
            </div>
            {typeof item.value === 'number' && (
              <div className="h-1 w-full rounded-full" style={{ background: "hsl(220,10%,18%)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${item.value}%`,
                    background: "linear-gradient(90deg, #00c853, #00e676)",
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
