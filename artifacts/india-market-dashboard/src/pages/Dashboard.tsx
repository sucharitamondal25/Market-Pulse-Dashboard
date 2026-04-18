import { TickerBar } from "@/components/TickerBar";
import { Header } from "@/components/Header";
import { DecisionPanel } from "@/components/DecisionPanel";
import { VolatilityCard } from "@/components/VolatilityCard";
import { TrendCard } from "@/components/TrendCard";
import { BreadthCard } from "@/components/BreadthCard";
import { MomentumCard } from "@/components/MomentumCard";
import { MacroCard } from "@/components/MacroCard";
import { ExecutionWindow } from "@/components/ExecutionWindow";
import { SectorPerformance } from "@/components/SectorPerformance";
import { ScoringWeights } from "@/components/ScoringWeights";
import { TopStocks } from "@/components/TopStocks";
import { AlertsFeed } from "@/components/AlertsFeed";
import { FyersAuthBanner } from "@/components/FyersAuthBanner";
import { useFyersAuth, useDashboard } from "@/hooks/useDashboard";

export default function Dashboard() {
  const { authenticated, login } = useFyersAuth();
  const { data, loading, lastUpdated } = useDashboard(authenticated);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(220,13%,9%)", fontFamily: "'Inter', monospace" }}>
      <Header authenticated={authenticated} onLogin={login} lastUpdated={lastUpdated} loading={loading} />
      <TickerBar ticker={data?.ticker} />

      <main className="flex-1 p-3 flex flex-col gap-3 overflow-auto">
        {authenticated === false && (
          <FyersAuthBanner onLogin={login} />
        )}
        {authenticated === true && data && (
          <div
            className="flex items-center gap-2 px-4 py-2 text-[11px] font-mono rounded"
            style={{
              background: "rgba(0,230,118,0.06)",
              border: "1px solid rgba(0,230,118,0.2)",
              color: "#00e676",
            }}
          >
            <div className="w-2 h-2 rounded-full bg-[#00e676] live-dot" />
            Live Fyers data — auto-refreshes every 30s
            {lastUpdated && (
              <span className="ml-2 text-muted-foreground">
                Last update: {lastUpdated.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" })} IST
              </span>
            )}
          </div>
        )}

        <DecisionPanel decision={data?.decision} scores={data?.scores} />

        <div className="grid grid-cols-5 gap-2">
          <VolatilityCard data={data?.volatility} />
          <TrendCard data={data?.trend} />
          <BreadthCard data={data?.breadth} />
          <MomentumCard data={data?.momentum} />
          <MacroCard data={data?.macro} />
        </div>

        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-3">
            <ExecutionWindow scores={data?.scores} />
          </div>
          <div className="col-span-4">
            <SectorPerformance sectors={data?.sectors} />
          </div>
          <div className="col-span-3">
            <ScoringWeights scores={data?.scores} decision={data?.decision} />
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <TopStocks stocks={data?.topStocks} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-8">
            <AlertsFeed />
          </div>
          <div className="col-span-4">
            <MarketQuickStats data={data} />
          </div>
        </div>
      </main>
    </div>
  );
}

function MarketQuickStats({ data }: { data: any }) {
  const niftyTicker = data?.ticker?.find((t: any) => t.symbol === "NIFTY 50");
  const vixTicker = data?.ticker?.find((t: any) => t.symbol === "INDIA VIX");
  const bankniftyTicker = data?.ticker?.find((t: any) => t.symbol === "BANKNIFTY");
  const midcapTicker = data?.ticker?.find((t: any) => t.symbol === "NIFTY MIDCAP");

  const stats = [
    { label: "NIFTY 50", value: niftyTicker ? `₹${niftyTicker.value} (${niftyTicker.change})` : "—", up: niftyTicker?.up ?? null },
    { label: "BANKNIFTY", value: bankniftyTicker ? `₹${bankniftyTicker.value} (${bankniftyTicker.change})` : "—", up: bankniftyTicker?.up ?? null },
    { label: "NIFTY MIDCAP", value: midcapTicker ? `${midcapTicker.change}` : "—", up: midcapTicker?.up ?? null },
    { label: "INDIA VIX", value: vixTicker ? `${vixTicker.value}` : "—", up: vixTicker ? !vixTicker.up : null },
    { label: "Trend Score", value: data?.scores ? `${data.scores.trend}/100` : "—", up: (data?.scores?.trend ?? 0) >= 60 },
    { label: "Momentum Score", value: data?.scores ? `${data.scores.momentum}/100` : "—", up: (data?.scores?.momentum ?? 0) >= 60 },
    { label: "Breadth Score", value: data?.scores ? `${data.scores.breadth}/100` : "—", up: (data?.scores?.breadth ?? 0) >= 60 },
    { label: "Overall Score", value: data?.decision ? `${data.decision.score}/100` : "—", up: (data?.decision?.score ?? 0) >= 60 },
  ];

  return (
    <div className="card-dark rounded p-3 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs">📋</span>
        <span className="section-header">Market Stats</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            <span
              className="text-[10px] font-mono font-semibold"
              style={{
                color: stat.up === null ? "hsl(220,10%,70%)" : stat.up ? "#00e676" : "#ff1744",
              }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
