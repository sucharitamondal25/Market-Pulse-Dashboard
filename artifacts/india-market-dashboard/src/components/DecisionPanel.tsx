import { decisionData } from "@/data/marketData";
import { ScoreRing } from "./ScoreRing";
import { MiniScoreBar } from "./MiniScoreBar";
import { scoringWeights } from "@/data/marketData";

export function DecisionPanel() {
  const { decision, score, mode, positionSize, risk } = decisionData;
  const isYes = decision === "YES";

  return (
    <div className="card-dark rounded p-4 flex flex-col gap-3 border-l-2" style={{ borderLeftColor: isYes ? "#00e676" : "#ff1744" }}>
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Decision</span>
          <div
            className="px-4 py-2 rounded border-2 font-bold text-2xl font-mono"
            style={{
              color: isYes ? "#00e676" : "#ff1744",
              borderColor: isYes ? "#00e676" : "#ff1744",
              background: isYes ? "rgba(0,230,118,0.08)" : "rgba(255,23,68,0.08)",
              boxShadow: isYes ? "0 0 16px rgba(0,230,118,0.2)" : "0 0 16px rgba(255,23,68,0.2)",
              textShadow: isYes ? "0 0 12px #00e676" : "0 0 12px #ff1744",
            }}
          >
            {decision}
          </div>
          <span className="text-[9px] text-muted-foreground">{mode}</span>
        </div>

        <ScoreRing score={score} size={72} strokeWidth={5} />

        <div className="flex flex-col gap-2 flex-1">
          {scoringWeights.slice(0, 3).map((item) => (
            <MiniScoreBar key={item.label} label={item.label} score={item.score} />
          ))}
        </div>

        <div className="ml-auto flex flex-col items-end gap-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Position Size</span>
          <div
            className="text-sm font-bold font-mono px-2 py-1 rounded"
            style={{
              color: "#00e676",
              background: "rgba(0,230,118,0.1)",
              border: "1px solid rgba(0,230,118,0.3)",
            }}
          >
            {positionSize}
          </div>
          <span className="text-[9px] text-muted-foreground italic">{risk}</span>
        </div>
      </div>
    </div>
  );
}
