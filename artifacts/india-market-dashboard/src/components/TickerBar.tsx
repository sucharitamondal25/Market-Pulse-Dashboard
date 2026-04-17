import { tickerData } from "@/data/marketData";

export function TickerBar() {
  const doubled = [...tickerData, ...tickerData];

  return (
    <div className="ticker-bar overflow-hidden py-1.5 px-0">
      <div className="ticker-animate">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-4 text-xs whitespace-nowrap">
            <span className="text-[hsl(220,10%,55%)] font-medium">{item.symbol}</span>
            <span className="text-foreground font-mono font-semibold">{item.value}</span>
            <span className={item.up ? "neon-green" : "neon-red"}>
              {item.change}
            </span>
            <span className="text-[hsl(220,10%,30%)] mx-2">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}
