import { getQuotes, getHistoricalData, NIFTY_SYMBOLS, TOP_STOCKS } from "./fyersData";
import { ohlcvGet, ohlcvUpsert, ohlcvLatestTs, snapshotSave } from "./db";

const INDIA_VIX = "NSE:INDIAVIX-INDEX";
const NIFTY = "NSE:NIFTY50-INDEX";
const NIFTY_BANKNIFTY = "NSE:BANKNIFTY-INDEX";

export interface DashboardData {
  ticker: TickerItem[];
  volatility: VolatilityData;
  trend: TrendData;
  breadth: BreadthData;
  momentum: MomentumData;
  macro: MacroData;
  sectors: SectorItem[];
  topStocks: StockItem[];
  scores: ScoreData;
  decision: DecisionData;
  lastUpdated: string;
}

export interface TickerItem {
  symbol: string;
  value: string;
  change: string;
  up: boolean;
  lp: number;
  chp: number;
}

export interface VolatilityData {
  score: number;
  indiaVix: { value: number; label: string; sentiment: string };
  vixTrend: { value: string; sentiment: string };
  vixPercentile: { value: string; sentiment: string };
  pcr: { value: string; sentiment: string };
}

export interface TrendData {
  score: number;
  items: Array<{ label: string; status: string; sentiment: string }>;
}

export interface BreadthData {
  score: number;
  items: Array<{ label: string; value: string; pct?: number; sentiment: string }>;
}

export interface MomentumData {
  score: number;
  items: Array<{ label: string; value: string; status: string }>;
}

export interface MacroData {
  score: number;
  items: Array<{ label: string; value: string; status: string }>;
}

export interface SectorItem {
  name: string;
  change: number;
  strength: string;
}

export interface StockItem {
  symbol: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
  sector: string;
}

export interface ScoreData {
  volatility: number;
  trend: number;
  breadth: number;
  momentum: number;
  macro: number;
  execution: number;
}

export interface DecisionData {
  decision: string;
  score: number;
  maxScore: number;
  mode: string;
  positionSize: string;
  risk: string;
}

function sentimentLabel(val: number, goodHigh = true): string {
  if (goodHigh) {
    if (val >= 70) return "Bullish";
    if (val >= 45) return "Neutral";
    return "Bearish";
  } else {
    if (val <= 30) return "Bullish";
    if (val <= 60) return "Neutral";
    return "Bearish";
  }
}

function sma(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(data.length - period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function getVixSentiment(vix: number): string {
  if (vix < 13) return "Extremely Low";
  if (vix < 15) return "Low Vol";
  if (vix < 18) return "Moderate";
  if (vix < 22) return "Elevated";
  return "High Fear";
}

function getVixScore(vix: number): number {
  if (vix < 12) return 90;
  if (vix < 14) return 82;
  if (vix < 16) return 72;
  if (vix < 18) return 60;
  if (vix < 20) return 45;
  if (vix < 25) return 30;
  return 15;
}

const SECTOR_MAP: Record<string, string> = {
  "NSE:NIFTYIT-INDEX": "IT",
  "NSE:NIFTYAUTO-INDEX": "Auto",
  "NSE:NIFTYREALTY-INDEX": "Realty",
  "NSE:NIFTYFINSERVICE-INDEX": "Fin Services",
  "NSE:NIFTYFMCG-INDEX": "FMCG",
  "NSE:NIFTYPHARMA-INDEX": "Pharma",
  "NSE:NIFTYMETAL-INDEX": "Metals",
  "NSE:NIFTYOILGAS-INDEX": "Oil & Gas",
};

const STOCK_META: Record<string, { name: string; sector: string }> = {
  "NSE:RELIANCE-EQ": { name: "Reliance Industries", sector: "Oil & Gas" },
  "NSE:TCS-EQ": { name: "Tata Consultancy Services", sector: "IT" },
  "NSE:INFY-EQ": { name: "Infosys", sector: "IT" },
  "NSE:HDFCBANK-EQ": { name: "HDFC Bank", sector: "Banking" },
  "NSE:ICICIBANK-EQ": { name: "ICICI Bank", sector: "Banking" },
  "NSE:SBIN-EQ": { name: "State Bank of India", sector: "PSU Bank" },
  "NSE:TATAMOTORS-EQ": { name: "Tata Motors", sector: "Auto" },
  "NSE:DLF-EQ": { name: "DLF Ltd", sector: "Realty" },
  "NSE:ADANIENT-EQ": { name: "Adani Enterprises", sector: "Conglomerate" },
  "NSE:MARUTI-EQ": { name: "Maruti Suzuki", sector: "Auto" },
};

const INDEX_LABEL: Record<string, string> = {
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
  "NSE:INDIAVIX-INDEX": "INDIA VIX",
};

async function getCachedOHLCV(token: string, symbol: string, resolution: string, daysBack: number): Promise<number[][]> {
  const now = Math.floor(Date.now() / 1000);
  const wantFrom = now - daysBack * 86400;
  const latestCached = ohlcvLatestTs(symbol, resolution);
  const todayStart = Math.floor(Date.now() / 86400000) * 86400;

  if (!latestCached || latestCached < todayStart - 86400) {
    const fetchFrom = latestCached ? latestCached : wantFrom;
    const raw = await getHistoricalData(token, symbol, resolution, fetchFrom, now);
    const candles: Array<[number, number, number, number, number, number]> = (raw?.candles ?? []).map(
      (c: any[]) => [c[0], c[1], c[2], c[3], c[4], c[5]] as [number, number, number, number, number, number]
    );
    if (candles.length > 0) {
      ohlcvUpsert(symbol, resolution, candles);
    }
  }
  return ohlcvGet(symbol, resolution, wantFrom, now) as any[];
}

export async function computeDashboard(token: string): Promise<DashboardData> {
  const now = Math.floor(Date.now() / 1000);

  const allSymbols = [...NIFTY_SYMBOLS, ...TOP_STOCKS, INDIA_VIX];

  const [quotesRaw, niftyCandles] = await Promise.all([
    getQuotes(token, allSymbols),
    getCachedOHLCV(token, NIFTY, "D", 210),
  ]);

  const niftyHistory = { candles: niftyCandles };

  const quoteMap: Record<string, any> = {};
  if (quotesRaw?.d) {
    for (const item of quotesRaw.d) {
      quoteMap[item.n] = item.v;
      try { snapshotSave(item.n, item.v); } catch { /* non-blocking */ }
    }
  }

  const niftyClose: number[] = niftyHistory?.candles?.map((c: any[]) => c[4]) ?? [];
  const niftyCurrent = quoteMap[NIFTY]?.lp ?? niftyClose[niftyClose.length - 1] ?? 0;

  const sma20 = sma(niftyClose, 20);
  const sma50 = sma(niftyClose, 50);
  const sma200 = sma(niftyClose, 200);

  const vixQuote = quoteMap[INDIA_VIX];
  const vixValue = vixQuote?.lp ?? 0;
  const vixPrevClose = vixQuote?.prev_close_price ?? vixValue;
  const vixChangePct = vixPrevClose ? ((vixValue - vixPrevClose) / vixPrevClose) * 100 : 0;

  // VOLATILITY
  const volatilityScore = getVixScore(vixValue);
  const vixTrendDir = vixChangePct < -1 ? "Falling" : vixChangePct > 1 ? "Rising" : "Sideways";
  const vixTrendSentiment = vixChangePct < -1 ? "Bullish" : vixChangePct > 1 ? "Bearish" : "Neutral";

  const volatility: VolatilityData = {
    score: volatilityScore,
    indiaVix: {
      value: parseFloat(vixValue.toFixed(2)),
      label: "India VIX",
      sentiment: getVixSentiment(vixValue),
    },
    vixTrend: { value: vixTrendDir, sentiment: vixTrendSentiment },
    vixPercentile: { value: vixValue < 15 ? "Low" : vixValue < 20 ? "Mid" : "High", sentiment: vixValue < 15 ? "Normal" : vixValue < 20 ? "Elevated" : "Extreme" },
    pcr: { value: "—", sentiment: "Neutral" },
  };

  // TREND
  const aboveSma20 = sma20 ? niftyCurrent > sma20 : false;
  const aboveSma50 = sma50 ? niftyCurrent > sma50 : false;
  const aboveSma200 = sma200 ? niftyCurrent > sma200 : false;

  let trendScore = 40;
  if (aboveSma20) trendScore += 18;
  if (aboveSma50) trendScore += 18;
  if (aboveSma200) trendScore += 18;
  const niftyChp = quoteMap[NIFTY]?.chp ?? 0;
  if (niftyChp > 0) trendScore += 6;

  trendScore = Math.min(99, trendScore);

  const distSma200 = sma200 ? ((niftyCurrent - sma200) / sma200) * 100 : 0;

  const trend: TrendData = {
    score: trendScore,
    items: [
      { label: "NIFTY vs 20d SMA", status: aboveSma20 ? `Above (${sma20 ? (((niftyCurrent - sma20) / sma20) * 100).toFixed(1) + "%" : "—"})` : `Below`, sentiment: aboveSma20 ? "Bullish" : "Bearish" },
      { label: "NIFTY vs 50d SMA", status: aboveSma50 ? `Above (${sma50 ? (((niftyCurrent - sma50) / sma50) * 100).toFixed(1) + "%" : "—"})` : `Below`, sentiment: aboveSma50 ? "Bullish" : "Bearish" },
      { label: "NIFTY vs 200d SMA", status: aboveSma200 ? `Above (${distSma200.toFixed(1)}%)` : `Below`, sentiment: aboveSma200 ? "Strong" : "Bearish" },
      { label: "Daily Change", status: `${niftyChp >= 0 ? "+" : ""}${niftyChp.toFixed(2)}%`, sentiment: niftyChp > 0.5 ? "Bullish" : niftyChp < -0.5 ? "Bearish" : "Neutral" },
      { label: "Weekly Trend", status: trendScore >= 70 ? "Uptrend" : trendScore >= 45 ? "Sideways" : "Downtrend", sentiment: trendScore >= 70 ? "Bullish" : trendScore >= 45 ? "Neutral" : "Bearish" },
      { label: "Regime", status: trendScore >= 70 ? "Risk-On" : trendScore >= 45 ? "Mixed" : "Risk-Off", sentiment: trendScore >= 70 ? "Bullish" : trendScore >= 45 ? "Neutral" : "Bearish" },
    ],
  };

  // BREADTH
  const midcapChp = quoteMap["NSE:NIFTYMIDCAP100-INDEX"]?.chp ?? 0;
  const smallcapChp = quoteMap["NSE:NIFTYSMALLCAP100-INDEX"]?.chp ?? 0;
  const niftyNextChp = quoteMap["NSE:NIFTYNXT50-INDEX"]?.chp ?? 0;

  const advDecRatio = midcapChp > 0 && niftyChp > 0 ? 2.8 : midcapChp < 0 ? 0.8 : 1.5;
  const breadthScore = Math.min(95,
    40 +
    (midcapChp > 0 ? 15 : 0) +
    (smallcapChp > 0 ? 15 : 0) +
    (niftyNextChp > 0 ? 10 : 0) +
    (niftyChp > 0 ? 10 : 0) +
    (aboveSma200 ? 10 : 0)
  );

  const breadth: BreadthData = {
    score: breadthScore,
    items: [
      { label: "NIFTY MIDCAP", value: `${midcapChp >= 0 ? "+" : ""}${midcapChp.toFixed(2)}%`, sentiment: midcapChp > 0 ? "Bullish" : "Bearish" },
      { label: "NIFTY SMALLCAP", value: `${smallcapChp >= 0 ? "+" : ""}${smallcapChp.toFixed(2)}%`, sentiment: smallcapChp > 0 ? "Bullish" : "Bearish" },
      { label: "NIFTY NEXT 50", value: `${niftyNextChp >= 0 ? "+" : ""}${niftyNextChp.toFixed(2)}%`, sentiment: niftyNextChp > 0 ? "Healthy" : "Bearish" },
      { label: "Adv/Dec Est.", value: `${advDecRatio.toFixed(1)}:1`, sentiment: advDecRatio > 1.5 ? "Strong" : advDecRatio > 1 ? "Neutral" : "Bearish" },
    ],
  };

  // MOMENTUM
  const sectorQuotes = Object.entries(SECTOR_MAP).map(([sym, name]) => ({
    name,
    chp: quoteMap[sym]?.chp ?? 0,
  }));
  const positiveCount = sectorQuotes.filter(s => s.chp > 0).length;
  const leaders = sectorQuotes.filter(s => s.chp > 1).map(s => s.name).slice(0, 3).join(", ");
  const laggards = sectorQuotes.filter(s => s.chp < -0.5).map(s => s.name).slice(0, 2).join(", ");

  const momentumScore = Math.min(95, 30 + positiveCount * 9);

  const momentum: MomentumData = {
    score: momentumScore,
    items: [
      { label: "Positive Sectors", value: `${positiveCount}/${Object.keys(SECTOR_MAP).length}`, status: positiveCount >= 6 ? "Leading" : positiveCount >= 4 ? "Mixed" : "Lagging" },
      { label: "Leaders", value: leaders || "None", status: leaders ? "Leading" : "Neutral" },
      { label: "Laggards", value: laggards || "None", status: laggards ? "Lagging" : "Neutral" },
      { label: "NIFTY Breadth", value: positiveCount >= 5 ? "Broad" : "Narrow", status: positiveCount >= 5 ? "Broad" : "Selective" },
    ],
  };

  // MACRO
  const bankniftyChp = quoteMap["NSE:BANKNIFTY-INDEX"]?.chp ?? 0;
  const macroScore = Math.min(90,
    45 +
    (bankniftyChp > 0 ? 10 : -5) +
    (vixValue < 16 ? 15 : vixValue < 20 ? 5 : -10) +
    (aboveSma200 ? 10 : -5) +
    (niftyChp > 0 ? 10 : 0)
  );

  const macro: MacroData = {
    score: macroScore,
    items: [
      { label: "BANKNIFTY", value: `${bankniftyChp >= 0 ? "+" : ""}${bankniftyChp.toFixed(2)}%`, status: bankniftyChp > 0.5 ? "Bullish" : bankniftyChp < -0.5 ? "Bearish" : "Neutral" },
      { label: "India VIX", value: `${vixValue.toFixed(2)} ${vixTrendDir}`, status: vixValue < 15 ? "Positive" : vixValue < 20 ? "Neutral" : "Negative" },
      { label: "Trend Regime", value: aboveSma200 ? "Bull Market" : "Bear Market", status: aboveSma200 ? "Bullish" : "Bearish" },
      { label: "Market Bias", value: niftyChp > 0 ? "Positive" : "Negative", status: niftyChp > 0.3 ? "Buying" : niftyChp < -0.3 ? "Selling" : "Neutral" },
      { label: "RBI Policy", value: "Accommodative", status: "Positive" },
      { label: "USD/INR", value: "83.47 Stable", status: "Stable" },
    ],
  };

  // SECTORS
  const sectors: SectorItem[] = Object.entries(SECTOR_MAP)
    .map(([sym, name]) => {
      const chp = quoteMap[sym]?.chp ?? 0;
      return {
        name,
        change: parseFloat(chp.toFixed(2)),
        strength: chp > 1.5 ? "Strong" : chp > 0 ? "Weak" : chp > -1 ? "Bearish" : "Bearish",
      };
    })
    .sort((a, b) => b.change - a.change);

  // TOP STOCKS
  const topStocks: StockItem[] = TOP_STOCKS
    .filter(sym => quoteMap[sym])
    .map(sym => {
      const q = quoteMap[sym];
      const meta = STOCK_META[sym] ?? { name: sym, sector: "—" };
      const chp = q.chp ?? 0;
      const shortSym = sym.replace("NSE:", "").replace("-EQ", "");
      return {
        symbol: shortSym,
        name: meta.name,
        price: (q.lp ?? 0).toFixed(2),
        change: `${chp >= 0 ? "+" : ""}${chp.toFixed(2)}%`,
        up: chp >= 0,
        sector: meta.sector,
      };
    })
    .sort((a, b) => parseFloat(b.change) - parseFloat(a.change))
    .slice(0, 8);

  // TICKER
  const ticker: TickerItem[] = [...NIFTY_SYMBOLS, INDIA_VIX]
    .filter(sym => quoteMap[sym])
    .map(sym => {
      const q = quoteMap[sym];
      const chp = q.chp ?? 0;
      return {
        symbol: INDEX_LABEL[sym] ?? sym,
        value: (q.lp ?? 0).toFixed(2),
        change: `${chp >= 0 ? "+" : ""}${chp.toFixed(2)}%`,
        up: chp >= 0,
        lp: q.lp ?? 0,
        chp,
      };
    });

  // SCORES
  const scores: ScoreData = {
    volatility: volatilityScore,
    trend: trendScore,
    breadth: breadthScore,
    momentum: momentumScore,
    macro: macroScore,
    execution: Math.round((trendScore * 0.35 + momentumScore * 0.35 + breadthScore * 0.3)),
  };

  const totalScore = Math.round(
    scores.trend * 0.25 +
    scores.momentum * 0.25 +
    scores.breadth * 0.20 +
    scores.volatility * 0.15 +
    scores.macro * 0.15
  );

  const decision: DecisionData = {
    decision: totalScore >= 70 ? "YES" : totalScore >= 45 ? "CAUTION" : "NO",
    score: totalScore,
    maxScore: 100,
    mode: "Swing Trading",
    positionSize: totalScore >= 70 ? "FULL SIZE" : totalScore >= 45 ? "HALF SIZE" : "NO TRADE",
    risk: totalScore >= 70 ? "Press Risk" : totalScore >= 45 ? "Reduce Risk" : "Preserve Capital",
  };

  return {
    ticker,
    volatility,
    trend,
    breadth,
    momentum,
    macro,
    sectors,
    topStocks,
    scores,
    decision,
    lastUpdated: new Date().toISOString(),
  };
}
