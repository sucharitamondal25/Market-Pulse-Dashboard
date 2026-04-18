import { tickerData } from "@/data/marketData";

function parseLiveTicker(liveData: any): typeof tickerData | null {
  if (!liveData?.d) return null;
  const labelMap: Record<string, string> = {
    "NSE:NIFTY50-INDEX": "NIFTY 50",
    "NSE:NIFTYNXT50-INDEX": "NIFTY NEXT 50",
    "NSE:BANKNIFTY-INDEX": "BANKNIFTY",
    "NSE:NIFTYIT-INDEX": "NIFTY IT",
    "NSE:NIFTYPHARMA-INDEX": "NIFTY PHARMA",
    "NSE:NIFTYAUTO-INDEX": "NIFTY AUTO",
    "NSE:NIFTYFINSERVICE-INDEX": "NIFTY FIN",
    "NSE:NIFTYMETAL-INDEX": "NIFTY METAL",
    "NSE:NIFTYFMCG-INDEX": "NIFTY FMCG",
    "NSE:NIFTYREALTY-INDEX": "NIFTY REALTY",
    "NSE:NIFTYMIDCAP100-INDEX": "NIFTY MIDCAP",
    "NSE:NIFTYSMALLCAP100-INDEX": "NIFTY SMALLCAP",
  };
  const result: typeof tickerData = [];
  for (const item of liveData.d) {
    const symbol = labelMap[item.n];
    if (symbol && item.v) {
      const lp = item.v.lp?.toFixed(2) ?? "—";
      const chp = item.v.chp?.toFixed(2) ?? "0";
      const up = (item.v.chp ?? 0) >= 0;
      result.push({ symbol, value: lp, change: `${up ? "+" : ""}${chp}%`, up });
    }
  }
  return result.length > 0 ? result : null;
}

interface TickerBarProps {
  liveData?: any;
}

export function TickerBar({ liveData }: TickerBarProps) {
  const source = parseLiveTicker(liveData) ?? tickerData;
  const doubled = [...source, ...source];

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
