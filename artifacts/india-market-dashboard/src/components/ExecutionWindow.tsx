import { executionWindow as mockExecution } from "@/data/marketData";
import { SentimentBadge } from "./SentimentBadge";
import type { ScoreData } from "@/hooks/useDashboard";

interface Props { scores?: ScoreData | null; }

export function ExecutionWindow({ scores }: Props) {
  const score = scores?.execution ?? 76;
  const color = score >= 70 ? "#00e676" : score >= 45 ? "#ffea00" : "#ff1744";

  const trend = scores?.trend ?? 88;
  const momentum = scores?.momentum ?? 72;
  const breadth = scores?.breadth ?? 65;
  const volatility = scores?.volatility ?? 78;

  const liveItems = scores
    ? [
        { question: "Trend supporting?", answer: trend >= 60 ? "Yes" : "No", status: trend >= 60 ? "Conviction" : "Failing" },
        { question: "Momentum positive?", answer: momentum >= 55 ? "Yes" : "No", status: momentum >= 55 ? "Holding" : "Failing" },
        { question: "Breadth healthy?", answer: breadth >= 50 ? "Yes" : "No", status: breadth >= 50 ? "Support" : "Failing" },
        { question: "Volatility low?", answer: volatility >= 55 ? "Yes" : "No", status: volatility >= 55 ? "Confirming" : "Failing" },
      ]
    : mockExecution;

  return (
    <div className="card-dark rounded p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#ff9100] live-dot" />
          <span className="section-header text-[#ff9100]">Execution Window</span>
        </div>
        <span className="text-base font-bold font-mono" style={{ color }}>{score}</span>
      </div>
      <div className="h-px bg-border" />
      <div className="flex flex-col gap-2.5">
        {liveItems.map((item) => (
          <div key={item.question} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${item.answer === "Yes" ? "bg-[#00e676]" : "bg-[#ff1744]"}`} />
              <span className="text-[10px] text-muted-foreground">{item.question}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-mono font-semibold ${item.answer === "Yes" ? "neon-green" : "neon-red"}`}>
                {item.answer}
              </span>
              <SentimentBadge sentiment={item.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
