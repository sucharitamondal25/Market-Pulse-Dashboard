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

const router: IRouter = Router();

const tokenStore: { token: string | null; expiresAt: number } = {
  token: null,
  expiresAt: 0,
};

function getToken(): string | null {
  if (tokenStore.token && Date.now() < tokenStore.expiresAt) {
    return tokenStore.token;
  }
  return null;
}

function setToken(token: string): void {
  tokenStore.token = token;
  tokenStore.expiresAt = Date.now() + 23 * 60 * 60 * 1000;
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

export default router;
