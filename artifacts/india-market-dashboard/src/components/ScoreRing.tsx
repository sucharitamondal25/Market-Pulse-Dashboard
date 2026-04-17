interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function ScoreRing({ score, maxScore = 100, size = 80, strokeWidth = 6, label }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = score / maxScore;
  const offset = circumference * (1 - pct);

  const color = score >= 70 ? "#00e676" : score >= 45 ? "#ffea00" : "#ff1744";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(220, 10%, 18%)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ color }}
        >
          <span className="text-xl font-bold font-mono leading-none">{score}</span>
          {maxScore === 100 && <span className="text-[9px] text-muted-foreground">/{maxScore}</span>}
        </div>
      </div>
      {label && <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>}
    </div>
  );
}
