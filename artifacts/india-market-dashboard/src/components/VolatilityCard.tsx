import { volatilityData } from "@/data/marketData";
import { SentimentBadge } from "./SentimentBadge";

export function VolatilityCard({ score }: { score: number }) {
  const color = score >= 70 ? "#00e676" : score >= 45 ? "#ffea00" : "#ff1744";

  return (
    <div className="card-dark rounded p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">📈</span>
          <span className="section-header text-[#00e676]">Volatility</span>
        </div>
        <span className="text-base font-bold font-mono" style={{ color }}>{score}</span>
      </div>
      <div className="h-px bg-border" />
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">India VIX</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-semibold text-foreground">{volatilityData.indiaVix.value}</span>
            <SentimentBadge sentiment={volatilityData.indiaVix.sentiment} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">VIX Trend</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-foreground">{volatilityData.vixTrend.value}</span>
            <SentimentBadge sentiment={volatilityData.vixTrend.sentiment} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">VIX Percentile</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-foreground">{volatilityData.vixPercentile.value}</span>
            <SentimentBadge sentiment={volatilityData.vixPercentile.sentiment} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Put/Call Ratio</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-foreground">{volatilityData.pcr.value}</span>
            <SentimentBadge sentiment={volatilityData.pcr.sentiment} />
          </div>
        </div>
      </div>
    </div>
  );
}
