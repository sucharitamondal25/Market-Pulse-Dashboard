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
import { useFyersAuth, useLiveIndices } from "@/hooks/useFyers";

const scores = {
  volatility: 78,
  trend: 88,
  breadth: 65,
  momentum: 72,
  macro: 58,
  execution: 76,
};

export default function Dashboard() {
  const { authenticated, login } = useFyersAuth();
  const { data: indicesData } = useLiveIndices();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(220,13%,9%)", fontFamily: "'Inter', monospace" }}>
      <Header authenticated={authenticated} onLogin={login} />
      <TickerBar liveData={indicesData} />

      <main className="flex-1 p-3 flex flex-col gap-3 overflow-auto">
        {authenticated === false && (
          <FyersAuthBanner onLogin={login} />
        )}
        {authenticated === true && (
          <div
            className="flex items-center gap-2 px-4 py-2 text-[11px] font-mono rounded"
            style={{
              background: "rgba(0,230,118,0.06)",
              border: "1px solid rgba(0,230,118,0.2)",
              color: "#00e676",
            }}
          >
            <div className="w-2 h-2 rounded-full bg-[#00e676] live-dot" />
            Fyers API connected — showing live market data (refreshes every 15s)
          </div>
        )}

        <DecisionPanel />

        <div className="grid grid-cols-5 gap-2">
          <VolatilityCard score={scores.volatility} />
          <TrendCard score={scores.trend} />
          <BreadthCard score={scores.breadth} />
          <MomentumCard score={scores.momentum} />
          <MacroCard score={scores.macro} />
        </div>

        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-3">
            <ExecutionWindow score={scores.execution} />
          </div>
          <div className="col-span-4">
            <SectorPerformance liveData={indicesData} />
          </div>
          <div className="col-span-3">
            <ScoringWeights />
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <TopStocks />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-8">
            <AlertsFeed />
          </div>
          <div className="col-span-4">
            <MarketQuickStats />
          </div>
        </div>
      </main>
    </div>
  );
}

function MarketQuickStats() {
  const stats = [
    { label: "FII Net (Today)", value: "+₹2,842 Cr", up: true },
    { label: "DII Net (Today)", value: "+₹1,124 Cr", up: true },
    { label: "Advance/Decline", value: "1,847 / 598", up: true },
    { label: "New 52W Highs", value: "142", up: true },
    { label: "New 52W Lows", value: "18", up: false },
    { label: "NIFTY OI PCR", value: "1.12 Neutral", up: true },
    { label: "ATM IV (NIFTY)", value: "13.2%", up: null },
    { label: "Max Pain (NIFTY)", value: "24,200", up: null },
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
