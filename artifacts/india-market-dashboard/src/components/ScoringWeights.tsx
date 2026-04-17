import { scoringWeights, totalScore } from "@/data/marketData";
import { MiniScoreBar } from "./MiniScoreBar";

export function ScoringWeights() {
  const scoreColor = totalScore >= 70 ? "#00e676" : totalScore >= 45 ? "#ffea00" : "#ff1744";
  const scoreBg = totalScore >= 70
    ? "rgba(0,200,83,0.1)"
    : totalScore >= 45
    ? "rgba(255,234,0,0.08)"
    : "rgba(255,23,68,0.1)";

  return (
    <div className="card-dark rounded p-3 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs">⚖️</span>
        <span className="section-header">Scoring Weights</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {scoringWeights.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-muted-foreground">w:{item.weight}%</span>
                <span className="text-[11px] font-mono font-bold" style={{ color: item.color }}>{item.score}</span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full" style={{ background: "hsl(220,10%,18%)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${item.score}%`,
                  background: `linear-gradient(90deg, ${item.color}80, ${item.color})`,
                  boxShadow: `0 0 6px ${item.color}40`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 h-px bg-border" />

      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Total Score</span>
        <div
          className="px-2 py-0.5 rounded font-mono font-bold text-sm"
          style={{ color: scoreColor, background: scoreBg, border: `1px solid ${scoreColor}40` }}
        >
          {totalScore}/100
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-[#00e676]" />
          <span>70-100: YES (press risk)</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-[#ffea00]" />
          <span>45-70: CAUTION (selective)</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-[#ff1744]" />
          <span>0-45: NO (preserve capital)</span>
        </div>
      </div>
    </div>
  );
}
