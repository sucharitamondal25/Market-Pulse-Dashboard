import { useState, useEffect, useCallback, useRef } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api/fyers`;

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

export function useFyersAuth() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/status`);
      const d = await r.json() as { authenticated: boolean };
      setAuthenticated(d.authenticated);
    } catch {
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("fyers_auth") === "success") {
      setAuthenticated(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [checkStatus]);

  const login = async () => {
    const r = await fetch(`${API}/auth`);
    const d = await r.json() as { url: string };
    window.location.href = d.url;
  };

  return { authenticated, login };
}

export function useDashboard(authenticated: boolean | null) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/dashboard-data`);
      if (r.status === 401) {
        setError("unauthenticated");
        setLoading(false);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json() as DashboardData;
      setData(d);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) {
      fetchData();
      intervalRef.current = setInterval(fetchData, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [authenticated, fetchData]);

  return { data, loading, error, lastUpdated, refetch: fetchData };
}
