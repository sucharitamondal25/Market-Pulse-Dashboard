import { useState, useEffect } from "react";

export function Header() {
  const [time, setTime] = useState(new Date());
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now);
      const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const h = ist.getHours();
      const m = ist.getMinutes();
      const mins = h * 60 + m;
      setIsMarketOpen(mins >= 555 && mins <= 930);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const istTime = time.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const istDate = time.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b" style={{ background: "hsl(220,13%,8%)", borderColor: "hsl(220,10%,16%)" }}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold" style={{ background: "rgba(0,230,118,0.15)", border: "1px solid rgba(0,230,118,0.3)", color: "#00e676" }}>
            IM
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground tracking-wide">INDIA MARKET</span>
            <span className="text-[9px] text-muted-foreground tracking-widest uppercase">Sentiment Terminal</span>
          </div>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        <nav className="flex items-center gap-1">
          {["Dashboard", "Screener", "Backtesting", "Live Trading", "Strategy"].map((item, i) => (
            <button
              key={item}
              className="px-2.5 py-1 text-[10px] font-medium rounded transition-colors"
              style={{
                background: i === 0 ? "rgba(0,230,118,0.12)" : "transparent",
                color: i === 0 ? "#00e676" : "hsl(220,10%,55%)",
                border: i === 0 ? "1px solid rgba(0,230,118,0.25)" : "1px solid transparent",
              }}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? "bg-[#00e676] live-dot" : "bg-[#ff1744]"}`} />
          <span className="text-[10px] font-mono" style={{ color: isMarketOpen ? "#00e676" : "#ff1744" }}>
            {isMarketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[11px] font-mono font-bold text-foreground">{istTime} IST</span>
          <span className="text-[9px] text-muted-foreground">{istDate}</span>
        </div>
        <button className="text-[10px] px-2 py-1 rounded font-mono" style={{ background: "hsl(220,13%,14%)", color: "hsl(220,10%,55%)", border: "1px solid hsl(220,10%,20%)" }}>
          SWING
        </button>
        <button className="text-[10px] px-2 py-1 rounded font-mono" style={{ background: "hsl(220,13%,14%)", color: "hsl(220,10%,55%)", border: "1px solid hsl(220,10%,20%)" }}>
          DAY
        </button>
      </div>
    </header>
  );
}
