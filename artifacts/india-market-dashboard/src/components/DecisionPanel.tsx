import { ScoreRing } from "./ScoreRing";
import { MiniScoreBar } from "./MiniScoreBar";
import type { DecisionData, ScoreData } from "@/hooks/useDashboard";
import { decisionData as mockDecision, scoringWeights } from "@/data/marketData";

interface Props {
  decision?: DecisionData | null;
  scores?: ScoreData | null;
}

export function DecisionPanel({ decision, scores }: Props) {
  const d = decision ?? mockDecision;
  const s = scores;
  const isYes = d.decision === "YES";
  const isCaution = d.decision === "CAUTION";
  const color = isYes ? "#00e676" : isCaution ? "#ffea00" : "#ff1744";

  return (
    <div className="card-dark rounded p-4 flex flex-col gap-3 border-l-2" style={{ borderLeftColor: color }}>
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Decision</span>
          <div
            className="px-4 py-2 rounded border-2 font-bold text-2xl font-mono"
            style={{
              color,
              borderColor: color,
              background: isYes ? "rgba(0,230,118,0.08)" : isCaution ? "rgba(255,234,0,0.08)" : "rgba(255,23,68,0.08)",
              boxShadow: `0 0 16px ${color}33`,
              textShadow: `0 0 12px ${color}`,
            }}
          >
            {d.decision}
          </div>
          <span className="text-[9px] text-muted-foreground">{d.mode}</span>
        </div>

        <ScoreRing score={d.score} size={72} strokeWidth={5} />

        <div className="flex flex-col gap-2 flex-1">
          <MiniScoreBar label="Trend" score={s?.trend ?? scoringWeights[0].score} />
          <MiniScoreBar label="Momentum" score={s?.momentum ?? scoringWeights[1].score} />
          <MiniScoreBar label="Breadth" score={s?.breadth ?? scoringWeights[2].score} />
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <MiniScoreBar label="Volatility" score={s?.volatility ?? scoringWeights[3].score} />
          <MiniScoreBar label="Macro" score={s?.macro ?? scoringWeights[4].score} />
          <MiniScoreBar label="Execution" score={s?.execution ?? 76} />
        </div>

        <div className="ml-auto flex flex-col items-end gap-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Position Size</span>
          <div
            className="text-sm font-bold font-mono px-2 py-1 rounded"
            style={{ color, background: `${color}18`, border: `1px solid ${color}40` }}
          >
            {d.positionSize}
          </div>
          <span className="text-[9px] text-muted-foreground italic">{d.risk}</span>
        </div>
      </div>
    </div>
  );
}
