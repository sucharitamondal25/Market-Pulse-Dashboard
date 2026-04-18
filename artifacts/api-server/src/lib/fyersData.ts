const FYERS_API_BASE = "https://api-t1.fyers.in/data";
const FYERS_API_V3 = "https://api-t1.fyers.in/api/v3";
const APP_ID = process.env.FYERS_APP_ID!;

async function fyersGet(path: string, token: string, params?: Record<string, string>) {
  const url = new URL(path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const resp = await fetch(url.toString(), {
    headers: {
      Authorization: `${APP_ID}:${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Fyers API error ${resp.status}: ${text}`);
  }
  return resp.json();
}

export async function getQuotes(token: string, symbols: string[]): Promise<any> {
  const symbolStr = symbols.join(",");
  return fyersGet(`${FYERS_API_BASE}/quotes`, token, { symbols: symbolStr });
}

export async function getMarketDepth(token: string, symbol: string): Promise<any> {
  return fyersGet(`${FYERS_API_BASE}/depth`, token, { symbol, ohlcv_flag: "1" });
}

export async function getFunds(token: string): Promise<any> {
  return fyersGet(`${FYERS_API_V3}/funds`, token);
}

export async function getPositions(token: string): Promise<any> {
  return fyersGet(`${FYERS_API_V3}/positions`, token);
}

export async function getHoldings(token: string): Promise<any> {
  return fyersGet(`${FYERS_API_V3}/holdings`, token);
}

export async function getOrders(token: string): Promise<any> {
  return fyersGet(`${FYERS_API_V3}/orders`, token);
}

export async function getUserProfile(token: string): Promise<any> {
  return fyersGet(`${FYERS_API_V3}/profile`, token);
}

export async function getMarketStatus(token: string): Promise<any> {
  return fyersGet(`${FYERS_API_V3}/market-status`, token);
}

export async function getHistoricalData(
  token: string,
  symbol: string,
  resolution: string,
  dateFrom: number,
  dateTo: number
): Promise<any> {
  return fyersGet(`${FYERS_API_DATA_V3}/history`, token, {
    symbol,
    resolution,
    date_format: "1",
    range_from: String(dateFrom),
    range_to: String(dateTo),
    cont_flag: "1",
  });
}

const FYERS_API_DATA_V3 = "https://api-t1.fyers.in/data";

export const NIFTY_SYMBOLS = [
  "NSE:NIFTY50-INDEX",
  "NSE:NIFTYNXT50-INDEX",
  "NSE:BANKNIFTY-INDEX",
  "NSE:NIFTYIT-INDEX",
  "NSE:NIFTYPHARMA-INDEX",
  "NSE:NIFTYAUTO-INDEX",
  "NSE:NIFTYFINSERVICE-INDEX",
  "NSE:NIFTYMETAL-INDEX",
  "NSE:NIFTYFMCG-INDEX",
  "NSE:NIFTYREALTY-INDEX",
  "NSE:NIFTYMIDCAP100-INDEX",
  "NSE:NIFTYSMALLCAP100-INDEX",
];

export const TOP_STOCKS = [
  "NSE:RELIANCE-EQ",
  "NSE:TCS-EQ",
  "NSE:INFY-EQ",
  "NSE:HDFCBANK-EQ",
  "NSE:ICICIBANK-EQ",
  "NSE:SBIN-EQ",
  "NSE:TATAMOTORS-EQ",
  "NSE:DLF-EQ",
  "NSE:ADANIENT-EQ",
  "NSE:MARUTI-EQ",
];
