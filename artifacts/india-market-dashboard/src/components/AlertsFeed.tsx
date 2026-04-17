import { recentAlerts } from "@/data/marketData";

export function AlertsFeed() {
  return (
    <div className="card-dark rounded p-3 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#00e676] live-dot" />
        <span className="section-header">Market Alerts</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {recentAlerts.map((alert, i) => (
          <div key={i} className="flex gap-2 items-start py-1.5 px-2 rounded" style={{ background: "hsl(220,13%,13%)" }}>
            <div
              className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
              style={{ background: alert.type === "bullish" ? "#00e676" : "#ff1744" }}
            />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[9px] text-muted-foreground font-mono">{alert.time}</span>
              <span className="text-[10px] text-foreground leading-snug">{alert.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
