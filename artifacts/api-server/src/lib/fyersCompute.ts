import {
  getQuotes,
  getHistoricalData,
  getOptionChain,
  BROAD_INDICES,
  SECTORAL_INDICES,
  SECTOR_INDEX_LABEL,
  NIFTY50_COMPONENTS,
  STOCK_META,
  INDEX_LABEL,
  INDIA_VIX,
  NIFTY_INDEX,
  BANKNIFTY_INDEX,
} from "./fyersData";
import { ohlcvGet, ohlcvUpsert, ohlcvLatestTs, ohlcvOldestTs, snapshotSave } from "./db";

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
  meta: { universeSize: number; cachedHistorySymbols: number };
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

// ----- Helpers -----
function sma(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(data.length - period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function percentile(values: number[], target: number): number {
  if (values.length === 0) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  let count = 0;
  for (const v of sorted) if (v <= target) count++;
  return Math.round((count / sorted.length) * 100);
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

// Concurrency-limited Promise.all
async function pLimit<T, R>(items: T[], concurrency: number, fn: (it: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = await fn(items[i]);
      } catch {
        results[i] = undefined as any;
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// Returns midnight UTC of the most recent NSE trading day (Mon-Fri whose close is past).
// Daily candles are timestamped near market open, so any candle >= this start is "fresh".
function lastTradingDayStartTs(): number {
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getTime() - i * 86400_000);
    const dow = d.getUTCDay(); // 0=Sun, 6=Sat
    if (dow === 0 || dow === 6) continue;
    const close = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 10, 0, 0);
    if (close <= now.getTime()) {
      return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0) / 1000);
    }
  }
  return Math.floor(now.getTime() / 1000) - 86400;
}

async function getCachedOHLCV(
  token: string,
  symbol: string,
  resolution: string,
  daysBack: number
): Promise<number[][]> {
  const nowSec = Math.floor(Date.now() / 1000);
  const wantFrom = nowSec - daysBack * 86400;
  const latestCached = ohlcvLatestTs(symbol, resolution);
  const oldestCached = ohlcvOldestTs(symbol, resolution);
  // Refetch only if cache has no candle from the most recent trading day at all.
  // Daily candles are timestamped near market open, so any candle >= last trading
  // day's midnight UTC is "fresh enough". Avoids hammering Fyers on weekends/holidays.
  const stalenessCutoff = lastTradingDayStartTs();

  // Forward fetch: pull recent candles if cache is empty or missing latest trading day
  if (!latestCached || latestCached < stalenessCutoff) {
    const fetchFrom = latestCached ? latestCached - 86400 : wantFrom;
    try {
      const raw = await getHistoricalData(token, symbol, resolution, fetchFrom, nowSec);
      const candles: Array<[number, number, number, number, number, number]> = (raw?.candles ?? []).map(
        (c: any[]) =>
          [Number(c[0]), Number(c[1]), Number(c[2]), Number(c[3]), Number(c[4]), Number(c[5])] as [
            number, number, number, number, number, number
          ]
      );
      if (candles.length > 0) ohlcvUpsert(symbol, resolution, candles);
    } catch (e) {
      console.error(`OHLCV forward fetch error for ${symbol}:`, (e as Error).message);
    }
  }

  // Backfill: pull older candles if cache doesn't reach back to wantFrom
  // Add 7-day buffer to avoid re-fetching when cache start is "close enough" to weekends/holidays
  if (oldestCached && oldestCached > wantFrom + 7 * 86400) {
    try {
      const raw = await getHistoricalData(token, symbol, resolution, wantFrom, oldestCached);
      const candles: Array<[number, number, number, number, number, number]> = (raw?.candles ?? []).map(
        (c: any[]) =>
          [Number(c[0]), Number(c[1]), Number(c[2]), Number(c[3]), Number(c[4]), Number(c[5])] as [
            number, number, number, number, number, number
          ]
      );
      if (candles.length > 0) ohlcvUpsert(symbol, resolution, candles);
    } catch (e) {
      console.error(`OHLCV backfill error for ${symbol}:`, (e as Error).message);
    }
  }

  return ohlcvGet(symbol, resolution, wantFrom, nowSec) as any[];
}

interface StockSnapshot {
  symbol: string;
  closes: number[];      // historical closes
  highs: number[];       // historical highs
  lows: number[];        // historical lows
  currentLp: number;
  currentChp: number;
}

function buildStockSnapshot(symbol: string, candles: number[][], currentLp: number, currentChp: number): StockSnapshot {
  const closes: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  for (const c of candles) {
    highs.push(Number(c[2]));
    lows.push(Number(c[3]));
    closes.push(Number(c[4]));
  }
  return { symbol, closes, highs, lows, currentLp, currentChp };
}

interface BreadthMetrics {
  total: number;
  above50: number;
  above200: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  new52wHigh: number;
  new52wLow: number;
}

function computeBreadthMetrics(snapshots: StockSnapshot[]): BreadthMetrics {
  let above50 = 0,
    above200 = 0,
    advancers = 0,
    decliners = 0,
    unchanged = 0,
    new52wHigh = 0,
    new52wLow = 0;
  let valid = 0;
  for (const s of snapshots) {
    if (s.closes.length < 5) continue;
    valid++;
    const sma50 = sma(s.closes, 50);
    const sma200 = sma(s.closes, 200);
    if (sma50 && s.currentLp > sma50) above50++;
    if (sma200 && s.currentLp > sma200) above200++;
    if (s.currentChp > 0.05) advancers++;
    else if (s.currentChp < -0.05) decliners++;
    else unchanged++;
    // 52w hi/lo from last ~252 trading days
    const window = 252;
    const hi = Math.max(...s.highs.slice(-window));
    const lo = Math.min(...s.lows.slice(-window).filter((x) => x > 0));
    if (s.currentLp >= hi * 0.999) new52wHigh++;
    if (s.currentLp <= lo * 1.001) new52wLow++;
  }
  return { total: valid, above50, above200, advancers, decliners, unchanged, new52wHigh, new52wLow };
}

async function fetchPCR(token: string): Promise<{ value: number | null; oiPCR: number | null }> {
  try {
    const oc: any = await getOptionChain(token, NIFTY_INDEX, 10);
    const data = oc?.data ?? oc;
    const optionsChain: any[] =
      data?.optionsChain ?? data?.options ?? data?.records?.data ?? [];
    let totalCallVol = 0,
      totalPutVol = 0,
      totalCallOI = 0,
      totalPutOI = 0;
    for (const row of optionsChain) {
      const opt_type = (row.option_type || row.optionType || "").toUpperCase();
      const vol = Number(row.volume ?? row.vol ?? 0);
      const oi = Number(row.oi ?? row.openInterest ?? 0);
      if (opt_type === "CE" || opt_type === "C") {
        totalCallVol += vol;
        totalCallOI += oi;
      } else if (opt_type === "PE" || opt_type === "P") {
        totalPutVol += vol;
        totalPutOI += oi;
      }
    }
    const pcrVol = totalCallVol > 0 ? totalPutVol / totalCallVol : null;
    const pcrOI = totalCallOI > 0 ? totalPutOI / totalCallOI : null;
    return { value: pcrVol, oiPCR: pcrOI };
  } catch (e) {
    console.error("Option chain fetch failed:", (e as Error).message);
    return { value: null, oiPCR: null };
  }
}

// ----- Main compute -----
export async function computeDashboard(token: string): Promise<DashboardData> {
  const allIndexSymbols = [...BROAD_INDICES, ...SECTORAL_INDICES, INDIA_VIX];
  const allEquitySymbols = NIFTY50_COMPONENTS;

  // 1. Fetch all quotes (chunked) + Nifty/VIX/BankNifty history + PCR in parallel
  const [indexQuotesRaw, equityQuotesRaw, niftyCandles, vixCandles, bankNiftyCandles, pcr] = await Promise.all([
    getQuotes(token, allIndexSymbols),
    getQuotes(token, allEquitySymbols),
    getCachedOHLCV(token, NIFTY_INDEX, "D", 360),
    getCachedOHLCV(token, INDIA_VIX, "D", 360),
    getCachedOHLCV(token, BANKNIFTY_INDEX, "D", 360),
    fetchPCR(token),
  ]);

  // Build quote map
  const quoteMap: Record<string, any> = {};
  for (const r of [indexQuotesRaw, equityQuotesRaw]) {
    if (r?.d) {
      for (const item of r.d) {
        quoteMap[item.n] = item.v;
        try { snapshotSave(item.n, item.v); } catch { /* non-blocking */ }
      }
    }
  }

  // 2. Cache OHLCV for all 50 stocks (concurrency-limited; first run is slow, then fast)
  // 360 calendar days (under Fyers' 366-day max range) ≈ 250 trading days — enough for 200d SMA + 52w
  // Concurrency 3 + small delay to avoid Fyers' 429 rate limit
  const stockCandlesMap: Record<string, number[][]> = {};
  await pLimit(allEquitySymbols, 3, async (sym) => {
    stockCandlesMap[sym] = await getCachedOHLCV(token, sym, "D", 360);
  });

  // 3. Build stock snapshots for breadth math
  const stockSnapshots: StockSnapshot[] = allEquitySymbols.map((sym) => {
    const q = quoteMap[sym];
    const candles = stockCandlesMap[sym] ?? [];
    return buildStockSnapshot(sym, candles, q?.lp ?? 0, q?.chp ?? 0);
  }).filter((s) => s.currentLp > 0);

  const breadthMetrics = computeBreadthMetrics(stockSnapshots);

  // 4. NIFTY metrics from history
  const niftyClose: number[] = niftyCandles.map((c: any[]) => c[4]);
  const niftyCurrent = quoteMap[NIFTY_INDEX]?.lp ?? niftyClose[niftyClose.length - 1] ?? 0;
  const niftyChp = quoteMap[NIFTY_INDEX]?.chp ?? 0;
  const sma20 = sma(niftyClose, 20);
  const sma50 = sma(niftyClose, 50);
  const sma200 = sma(niftyClose, 200);
  const aboveSma20 = sma20 ? niftyCurrent > sma20 : false;
  const aboveSma50 = sma50 ? niftyCurrent > sma50 : false;
  const aboveSma200 = sma200 ? niftyCurrent > sma200 : false;

  // 5. VIX
  const vixQuote = quoteMap[INDIA_VIX];
  const vixValue = vixQuote?.lp ?? 0;
  const vixPrev = vixQuote?.prev_close_price ?? vixValue;
  const vixChangePct = vixPrev ? ((vixValue - vixPrev) / vixPrev) * 100 : 0;
  const vixCloses = vixCandles.map((c: any[]) => c[4]).filter((v) => v > 0);
  const vixPctile = vixCloses.length > 30 ? percentile(vixCloses, vixValue) : null;

  // VOLATILITY
  const volatilityScore = getVixScore(vixValue);
  const vixTrendDir = vixChangePct < -1 ? "Falling" : vixChangePct > 1 ? "Rising" : "Sideways";
  const vixTrendSentiment = vixChangePct < -1 ? "Bullish" : vixChangePct > 1 ? "Bearish" : "Neutral";

  let pcrLabel = "—";
  let pcrSentiment = "Neutral";
  if (pcr.value != null) {
    pcrLabel = pcr.value.toFixed(2);
    if (pcr.value > 1.3) pcrSentiment = "Bullish";
    else if (pcr.value < 0.7) pcrSentiment = "Bearish";
    else pcrSentiment = "Neutral";
  }

  const volatility: VolatilityData = {
    score: volatilityScore,
    indiaVix: {
      value: parseFloat(vixValue.toFixed(2)),
      label: "India VIX",
      sentiment: getVixSentiment(vixValue),
    },
    vixTrend: { value: vixTrendDir, sentiment: vixTrendSentiment },
    vixPercentile: {
      value: vixPctile != null ? `${vixPctile}th` : vixValue < 15 ? "Low" : vixValue < 20 ? "Mid" : "High",
      sentiment: vixPctile != null ? (vixPctile < 30 ? "Calm" : vixPctile < 70 ? "Normal" : "Stressed") : "Normal",
    },
    pcr: { value: pcrLabel, sentiment: pcrSentiment },
  };

  // TREND
  let trendScore = 40;
  if (aboveSma20) trendScore += 18;
  if (aboveSma50) trendScore += 18;
  if (aboveSma200) trendScore += 18;
  if (niftyChp > 0) trendScore += 6;
  trendScore = Math.min(99, trendScore);
  const distSma200 = sma200 ? ((niftyCurrent - sma200) / sma200) * 100 : 0;

  const trend: TrendData = {
    score: trendScore,
    items: [
      { label: "NIFTY vs 20d SMA", status: aboveSma20 ? `Above (${sma20 ? (((niftyCurrent - sma20) / sma20) * 100).toFixed(1) + "%" : "—"})` : "Below", sentiment: aboveSma20 ? "Bullish" : "Bearish" },
      { label: "NIFTY vs 50d SMA", status: aboveSma50 ? `Above (${sma50 ? (((niftyCurrent - sma50) / sma50) * 100).toFixed(1) + "%" : "—"})` : "Below", sentiment: aboveSma50 ? "Bullish" : "Bearish" },
      { label: "NIFTY vs 200d SMA", status: aboveSma200 ? `Above (${distSma200.toFixed(1)}%)` : "Below", sentiment: aboveSma200 ? "Strong" : "Bearish" },
      { label: "Daily Change", status: `${niftyChp >= 0 ? "+" : ""}${niftyChp.toFixed(2)}%`, sentiment: niftyChp > 0.5 ? "Bullish" : niftyChp < -0.5 ? "Bearish" : "Neutral" },
      { label: "Weekly Trend", status: trendScore >= 70 ? "Uptrend" : trendScore >= 45 ? "Sideways" : "Downtrend", sentiment: trendScore >= 70 ? "Bullish" : trendScore >= 45 ? "Neutral" : "Bearish" },
      { label: "Regime", status: trendScore >= 70 ? "Risk-On" : trendScore >= 45 ? "Mixed" : "Risk-Off", sentiment: trendScore >= 70 ? "Bullish" : trendScore >= 45 ? "Neutral" : "Bearish" },
    ],
  };

  // BREADTH (REAL — computed from per-stock OHLCV history)
  const pctAbove50 = breadthMetrics.total > 0 ? Math.round((breadthMetrics.above50 / breadthMetrics.total) * 100) : 0;
  const pctAbove200 = breadthMetrics.total > 0 ? Math.round((breadthMetrics.above200 / breadthMetrics.total) * 100) : 0;
  const advDecRatio = breadthMetrics.decliners > 0
    ? breadthMetrics.advancers / breadthMetrics.decliners
    : breadthMetrics.advancers;
  const breadthScore = Math.min(99,
    20 +
    Math.round(pctAbove50 * 0.35) +
    Math.round(pctAbove200 * 0.25) +
    (advDecRatio > 2 ? 12 : advDecRatio > 1.5 ? 8 : advDecRatio > 1 ? 4 : 0) +
    (breadthMetrics.new52wHigh > breadthMetrics.new52wLow ? 8 : 0)
  );

  const breadth: BreadthData = {
    score: breadthScore,
    items: [
      { label: "% above 50d MA", value: `${pctAbove50}`, pct: pctAbove50, sentiment: pctAbove50 >= 60 ? "Healthy" : pctAbove50 >= 40 ? "Mixed" : "Weak" },
      { label: "% above 200d MA", value: `${pctAbove200}`, pct: pctAbove200, sentiment: pctAbove200 >= 60 ? "Healthy" : pctAbove200 >= 40 ? "Mixed" : "Weak" },
      { label: "Adv/Dec (Nifty 50)", value: `${breadthMetrics.advancers}:${breadthMetrics.decliners}`, sentiment: advDecRatio > 1.5 ? "Strong" : advDecRatio > 1 ? "Neutral" : "Weak" },
      { label: "New 52W H/L", value: `${breadthMetrics.new52wHigh}/${breadthMetrics.new52wLow}`, sentiment: breadthMetrics.new52wHigh > breadthMetrics.new52wLow ? "Bullish" : breadthMetrics.new52wHigh === breadthMetrics.new52wLow ? "Neutral" : "Bearish" },
    ],
  };

  // MOMENTUM (sectoral leadership using REAL sector chps)
  const sectorEntries = SECTORAL_INDICES.map((sym) => ({
    name: SECTOR_INDEX_LABEL[sym] ?? sym,
    sym,
    chp: quoteMap[sym]?.chp ?? 0,
    lp: quoteMap[sym]?.lp ?? 0,
  })).filter((s) => s.lp > 0);

  const positiveCount = sectorEntries.filter((s) => s.chp > 0).length;
  const sortedByChp = [...sectorEntries].sort((a, b) => b.chp - a.chp);
  const leaders = sortedByChp.slice(0, 3).filter((s) => s.chp > 0).map((s) => s.name).join(", ") || "None";
  const laggards = sortedByChp.slice(-3).filter((s) => s.chp < 0).map((s) => s.name).reverse().join(", ") || "None";

  const momentumScore = sectorEntries.length > 0
    ? Math.min(95, 25 + Math.round((positiveCount / sectorEntries.length) * 65))
    : 50;

  const momentum: MomentumData = {
    score: momentumScore,
    items: [
      { label: "Positive Sectors", value: `${positiveCount}/${sectorEntries.length}`, status: positiveCount >= sectorEntries.length * 0.6 ? "Leading" : positiveCount >= sectorEntries.length * 0.4 ? "Mixed" : "Lagging" },
      { label: "Leaders", value: leaders, status: leaders !== "None" ? "Leading" : "Neutral" },
      { label: "Laggards", value: laggards, status: laggards !== "None" ? "Lagging" : "Neutral" },
      { label: "Breadth Thrust", value: pctAbove50 >= 70 ? "Confirming" : pctAbove50 >= 50 ? "Mixed" : "Weak", status: pctAbove50 >= 70 ? "Positive" : pctAbove50 >= 50 ? "Neutral" : "Negative" },
      { label: "Participation", value: positiveCount >= 10 ? "Broad" : positiveCount >= 6 ? "Selective" : "Narrow", status: positiveCount >= 10 ? "Broad" : "Selective" },
    ],
  };

  // MACRO
  const bankNiftyClose: number[] = bankNiftyCandles.map((c: any[]) => c[4]);
  const bankSma200 = sma(bankNiftyClose, 200);
  const bankCurrent = quoteMap[BANKNIFTY_INDEX]?.lp ?? bankNiftyClose[bankNiftyClose.length - 1] ?? 0;
  const bankAbove200 = bankSma200 ? bankCurrent > bankSma200 : false;
  const bankniftyChp = quoteMap[BANKNIFTY_INDEX]?.chp ?? 0;

  const macroScore = Math.min(90,
    40 +
    (bankniftyChp > 0 ? 10 : -5) +
    (vixValue < 16 ? 15 : vixValue < 20 ? 5 : -10) +
    (aboveSma200 ? 10 : -5) +
    (bankAbove200 ? 8 : -3) +
    (niftyChp > 0 ? 8 : 0)
  );

  const macro: MacroData = {
    score: Math.max(10, macroScore),
    items: [
      { label: "BANKNIFTY", value: `${bankniftyChp >= 0 ? "+" : ""}${bankniftyChp.toFixed(2)}%`, status: bankniftyChp > 0.5 ? "Bullish" : bankniftyChp < -0.5 ? "Bearish" : "Neutral" },
      { label: "Bank vs 200d", value: bankAbove200 ? "Above" : "Below", status: bankAbove200 ? "Bullish" : "Bearish" },
      { label: "India VIX", value: `${vixValue.toFixed(2)} ${vixTrendDir}`, status: vixValue < 15 ? "Positive" : vixValue < 20 ? "Neutral" : "Negative" },
      { label: "Nifty Regime", value: aboveSma200 ? "Bull Market" : "Bear Market", status: aboveSma200 ? "Bullish" : "Bearish" },
      { label: "PCR (Vol)", value: pcrLabel, status: pcrSentiment },
      { label: "USD/INR", value: "—", status: "Stable" },
    ],
  };

  // SECTORS (full list)
  const sectors: SectorItem[] = sectorEntries
    .map((s) => ({
      name: s.name,
      change: parseFloat(s.chp.toFixed(2)),
      strength: s.chp > 1.5 ? "Strong" : s.chp > 0 ? "Bullish" : s.chp > -1 ? "Bearish" : "Weak",
    }))
    .sort((a, b) => b.change - a.change);

  // TOP STOCKS — top 8 from full Nifty 50 sorted by chp
  const topStocks: StockItem[] = NIFTY50_COMPONENTS
    .filter((sym) => quoteMap[sym]?.lp > 0)
    .map((sym) => {
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

  // TICKER (broad indices + VIX)
  const ticker: TickerItem[] = [...BROAD_INDICES, INDIA_VIX]
    .filter((sym) => quoteMap[sym])
    .map((sym) => {
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
    execution: Math.round(trendScore * 0.35 + momentumScore * 0.35 + breadthScore * 0.3),
  };

  const totalScore = Math.round(
    scores.trend * 0.25 +
    scores.momentum * 0.25 +
    scores.breadth * 0.2 +
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
    meta: {
      universeSize: stockSnapshots.length,
      cachedHistorySymbols: Object.keys(stockCandlesMap).filter((k) => stockCandlesMap[k].length > 0).length,
    },
  };
}
