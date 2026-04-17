interface MiniScoreBarProps {
  label: string;
  score: number;
  icon?: string;
  className?: string;
}

export function MiniScoreBar({ label, score, icon, className }: MiniScoreBarProps) {
  const color = score >= 70 ? "#00e676" : score >= 45 ? "#ffea00" : "#ff1744";
  const bgColor = score >= 70 ? "rgba(0,230,118,0.15)" : score >= 45 ? "rgba(255,234,0,0.12)" : "rgba(255,23,68,0.15)";

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          {icon && <span>{icon}</span>}
          {label}
        </span>
        <span className="text-sm font-bold font-mono" style={{ color }}>{score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full" style={{ background: "hsl(220,10%,18%)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 6px ${color}66`,
          }}
        />
      </div>
    </div>
  );
}
