import { SentimentBadge } from "./SentimentBadge";
import type { VolatilityData } from "@/hooks/useDashboard";
import { volatilityData as mockVol } from "@/data/marketData";

interface Props { data?: VolatilityData | null; }

export function VolatilityCard({ data }: Props) {
  const score = data?.score ?? 78;
  const color = score >= 70 ? "#00e676" : score >= 45 ? "#ffea00" : "#ff1744";

  const vix = data?.indiaVix ?? { value: mockVol.indiaVix.value, label: "India VIX", sentiment: mockVol.indiaVix.sentiment };
  const vixTrend = data?.vixTrend ?? { value: mockVol.vixTrend.value, sentiment: mockVol.vixTrend.sentiment };
  const vixPct = data?.vixPercentile ?? { value: mockVol.vixPercentile.value, sentiment: mockVol.vixPercentile.sentiment };
  const pcr = data?.pcr ?? { value: String(mockVol.pcr.value), sentiment: mockVol.pcr.sentiment };

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
            <span className="text-[11px] font-mono font-semibold text-foreground">{typeof vix.value === 'number' ? vix.value.toFixed(2) : vix.value}</span>
            <SentimentBadge sentiment={vix.sentiment} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">VIX Trend</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-foreground">{vixTrend.value}</span>
            <SentimentBadge sentiment={vixTrend.sentiment} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">VIX Level</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-foreground">{vixPct.value}</span>
            <SentimentBadge sentiment={vixPct.sentiment} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Put/Call Ratio</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-foreground">{pcr.value}</span>
            <SentimentBadge sentiment={pcr.sentiment} />
          </div>
        </div>
      </div>
    </div>
  );
}
