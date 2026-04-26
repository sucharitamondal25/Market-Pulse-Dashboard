import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { getFyersAuthUrl, exchangeCodeForToken } from "../lib/fyersAuth";
import {
  getQuotes,
  getFunds,
  getPositions,
  getHoldings,
  getOrders,
  getUserProfile,
  getMarketStatus,
  NIFTY_SYMBOLS,
  TOP_STOCKS,
} from "../lib/fyersData";
import { computeDashboard } from "../lib/fyersCompute";
import {
  tokenGet,
  tokenSave,
  alertsList,
  alertCreate,
  watchlistGet,
  watchlistAdd,
  watchlistRemove,
  ordersList,
  backtestList,
  backtestGet,
  db,
} from "../lib/db";

const router: IRouter = Router();

function getToken(): string | null {
  const stored = tokenGet();
  if (stored && Date.now() < stored.expiresAt) {
    return stored.token;
  }
  return null;
}

function setToken(token: string): void {
  const expiresAt = Date.now() + 23 * 60 * 60 * 1000;
  tokenSave(token, expiresAt);
}

router.get("/fyers/auth", async (req, res): Promise<void> => {
  try {
    const url = getFyersAuthUrl();
    res.json({ url });
  } catch (err) {
    req.log.error({ err }, "Failed to generate auth URL");
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
});

router.get("/fyers/callback", async (req, res): Promise<void> => {
  const { auth_code, code, state } = req.query as Record<string, string>;
  const authCode = auth_code || code;

  if (!authCode) {
    res.status(400).send("Missing auth_code");
    return;
  }

  try {
    const token = await exchangeCodeForToken(authCode);
    setToken(token);
    req.log.info("Fyers token obtained successfully");

    const domains = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost";
    res.redirect(`https://${domains}/?fyers_auth=success`);
  } catch (err) {
    req.log.error({ err }, "Token exchange failed");
    const domains = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost";
    res.redirect(`https://${domains}/?fyers_auth=error`);
  }
});

router.get("/fyers/status", async (req, res): Promise<void> => {
  const token = getToken();
  res.json({ authenticated: !!token });
});

router.post("/fyers/logout", async (req, res): Promise<void> => {
  try {
    db.prepare("DELETE FROM tokens WHERE id = 1").run();
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Logout failed");
    res.status(500).json({ error: "Logout failed" });
  }
});

router.get("/fyers/profile", async (req, res): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const data = await getUserProfile(token);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch profile");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.get("/fyers/quotes", async (req, res): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { symbols } = req.query as { symbols?: string };
  const symbolList = symbols ? symbols.split(",") : [...NIFTY_SYMBOLS, ...TOP_STOCKS];

  try {
    const data = await getQuotes(token, symbolList);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch quotes");
    res.status(500).json({ error: "Failed to fetch quotes" });
  }
});

router.get("/fyers/indices", async (req, res): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const data = await getQuotes(token, NIFTY_SYMBOLS);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch indices");
    res.status(500).json({ error: "Failed to fetch indices" });
  }
});

router.get("/fyers/market-status", async (req, res): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const data = await getMarketStatus(token);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch market status");
    res.status(500).json({ error: "Failed to fetch market status" });
  }
});

router.get("/fyers/funds", async (req, res): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const data = await getFunds(token);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch funds");
    res.status(500).json({ error: "Failed to fetch funds" });
  }
});

router.get("/fyers/positions", async (req, res): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const data = await getPositions(token);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch positions");
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});

router.get("/fyers/holdings", async (req, res): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const data = await getHoldings(token);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch holdings");
    res.status(500).json({ error: "Failed to fetch holdings" });
  }
});

router.get("/fyers/orders", async (req, res): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const data = await getOrders(token);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch orders");
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.get("/fyers/dashboard-data", async (req, res): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const data = await computeDashboard(token);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to compute dashboard data");
    res.status(500).json({ error: "Failed to compute dashboard data" });
  }
});

router.get("/alerts", (_req, res): void => {
  res.json(alertsList());
});

router.post("/alerts", (req, res): void => {
  const { symbol, type, condition, value, message } = req.body as any;
  if (!symbol || !type || !condition || value == null) {
    res.status(400).json({ error: "symbol, type, condition, value required" });
    return;
  }
  const id = alertCreate({ symbol, type, condition, value, message });
  res.status(201).json({ id });
});

router.delete("/alerts/:id", (req, res): void => {
  db.prepare("DELETE FROM alerts WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

router.get("/watchlist", (_req, res): void => {
  res.json(watchlistGet());
});

router.post("/watchlist", (req, res): void => {
  const { symbol, name, sector } = req.body as any;
  if (!symbol) { res.status(400).json({ error: "symbol required" }); return; }
  watchlistAdd(symbol, name, sector);
  res.status(201).json({ ok: true });
});

router.delete("/watchlist/:symbol", (req, res): void => {
  watchlistRemove(req.params.symbol);
  res.json({ ok: true });
});

router.get("/orders", (_req, res): void => {
  res.json(ordersList(100));
});

router.get("/backtests", (_req, res): void => {
  res.json(backtestList());
});

router.get("/backtests/:id", (req, res): void => {
  const run = backtestGet(Number(req.params.id));
  if (!run) { res.status(404).json({ error: "Not found" }); return; }
  if (run.result) {
    try { run.result = JSON.parse(run.result); } catch { /* leave as string */ }
  }
  const trades = db.prepare("SELECT * FROM backtest_trades WHERE run_id = ? ORDER BY entry_ts ASC").all(Number(req.params.id));
  res.json({ ...run, trades });
});

router.get("/db/stats", (_req, res): void => {
  const tables = ["tokens", "ohlcv_cache", "watchlist", "screener_criteria", "screener_results", "backtest_runs", "backtest_trades", "alerts", "orders", "quote_snapshots"];
  const stats: Record<string, number> = {};
  for (const t of tables) {
    const row = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get() as { c: number };
    stats[t] = row.c;
  }
  const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as { size: number };
  res.json({ tables: stats, dbSizeBytes: dbSize.size, dbPath: "data/market.db" });
});

export default router;
