import { sectorPerformance as mockSectors } from "@/data/marketData";
import type { SectorItem } from "@/hooks/useDashboard";

interface Props { sectors?: SectorItem[] | null; }

export function SectorPerformance({ sectors }: Props) {
  const data = sectors ?? mockSectors;
  const max = Math.max(...data.map(s => Math.abs(s.change)), 0.01);

  return (
    <div className="card-dark rounded p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs">📊</span>
        <span className="section-header">Sector Performance</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {data.map((sector) => {
          const pct = (Math.abs(sector.change) / max) * 100;
          const isPos = sector.change >= 0;
          return (
            <div key={sector.name} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-20 shrink-0 font-mono">{sector.name}</span>
              <div className="flex-1 h-3 rounded-sm overflow-hidden" style={{ background: "hsl(220,10%,16%)" }}>
                <div
                  className="h-full rounded-sm transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: isPos
                      ? "linear-gradient(90deg, #00c853, #00e676)"
                      : "linear-gradient(90deg, #c62828, #ff1744)",
                    boxShadow: isPos ? "0 0 6px #00e67640" : "0 0 6px #ff174440",
                  }}
                />
              </div>
              <span
                className="text-[10px] font-mono font-semibold w-14 text-right"
                style={{ color: isPos ? "#00e676" : "#ff1744" }}
              >
                {isPos ? "+" : ""}{sector.change.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
