import { sectorPerformance } from "@/data/marketData";

interface SectorPerformanceProps {
  liveData?: any;
}

function parseLiveSectors(liveData: any): typeof sectorPerformance | null {
  if (!liveData?.d) return null;
  const symbolMap: Record<string, string> = {
    "NSE:NIFTYIT-INDEX": "IT",
    "NSE:NIFTYAUTO-INDEX": "Auto",
    "NSE:NIFTYREALTY-INDEX": "Realty",
    "NSE:NIFTYFINSERVICE-INDEX": "Fin Services",
    "NSE:NIFTYFMCG-INDEX": "FMCG",
    "NSE:NIFTYPHARMA-INDEX": "Pharma",
    "NSE:NIFTYMETAL-INDEX": "Metals",
  };
  const result: typeof sectorPerformance = [];
  for (const item of liveData.d) {
    const name = symbolMap[item.n];
    if (name && item.v?.chp !== undefined) {
      result.push({ name, change: parseFloat(item.v.chp.toFixed(2)), strength: item.v.chp >= 1 ? "Strong" : item.v.chp >= 0 ? "Weak" : "Bearish" });
    }
  }
  return result.length >= 3 ? result.sort((a, b) => b.change - a.change) : null;
}

export function SectorPerformance({ liveData }: SectorPerformanceProps) {
  const sectors = parseLiveSectors(liveData) ?? sectorPerformance;
  const max = Math.max(...sectors.map(s => Math.abs(s.change)));

  return (
    <div className="card-dark rounded p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs">📊</span>
        <span className="section-header">Sector Performance</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {sectors.map((sector) => {
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
                className="text-[10px] font-mono font-semibold w-12 text-right"
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
