import { useState, useEffect, useCallback } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api/fyers`;

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

  return { authenticated, login, checkStatus };
}

export function useLiveQuotes(symbols?: string[]) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = symbols ? `?symbols=${symbols.join(",")}` : "";
      const r = await fetch(`${API}/quotes${params}`);
      if (r.status === 401) { setError("unauthenticated"); return; }
      const d = await r.json();
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [symbols?.join(",")]);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, 15000);
    return () => clearInterval(interval);
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export function useLiveIndices() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch(`${API}/indices`);
      if (!r.ok) return;
      const d = await r.json();
      setData(d);
    } catch {}
  }, []);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, 15000);
    return () => clearInterval(interval);
  }, [fetch_]);

  return { data, error };
}

export function useFunds() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/funds`).then(r => r.ok ? r.json() : null).then(d => d && setData(d)).catch(() => {});
  }, []);

  return { data };
}

export function usePositions() {
  const [data, setData] = useState<any>(null);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch(`${API}/positions`);
      if (r.ok) setData(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, 10000);
    return () => clearInterval(interval);
  }, [fetch_]);

  return { data, refetch: fetch_ };
}
