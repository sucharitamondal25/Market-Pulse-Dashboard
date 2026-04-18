import { topStocks as mockStocks } from "@/data/marketData";
import type { StockItem } from "@/hooks/useDashboard";

interface Props { stocks?: StockItem[] | null; }

export function TopStocks({ stocks }: Props) {
  const data = stocks ?? mockStocks;

  return (
    <div className="card-dark rounded p-3 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs">🏆</span>
        <span className="section-header">Top Movers</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {data.map((stock) => (
          <div key={stock.symbol} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: "hsl(220,13%,13%)" }}>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold text-foreground">{stock.symbol}</span>
              <span className="text-[9px] text-muted-foreground">{stock.sector}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-mono font-semibold text-foreground">₹{stock.price}</span>
              <span className={`text-[10px] font-mono font-bold ${stock.up ? "neon-green" : "neon-red"}`}>
                {stock.change}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
