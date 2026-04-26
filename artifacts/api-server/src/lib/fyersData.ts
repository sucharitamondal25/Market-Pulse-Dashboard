const FYERS_API_BASE = "https://api-t1.fyers.in/data";
const FYERS_API_V3 = "https://api-t1.fyers.in/api/v3";
const APP_ID = process.env.FYERS_APP_ID!;

async function fyersGet(path: string, token: string, params?: Record<string, string>, attempt = 0): Promise<any> {
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
    // Retry on 429 (rate limit) up to 2x with exponential backoff
    if (resp.status === 429 && attempt < 2) {
      const delay = 800 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      return fyersGet(path, token, params, attempt + 1);
    }
    throw new Error(`Fyers API error ${resp.status} on ${path}: ${text}`);
  }
  return resp.json();
}

const QUOTE_BATCH_SIZE = 50;

export async function getQuotes(token: string, symbols: string[]): Promise<{ s?: string; d?: any[] }> {
  // Always batch + always swallow errors so caller gets partial data instead of throwing
  const batches: string[][] = [];
  for (let i = 0; i < symbols.length; i += QUOTE_BATCH_SIZE) {
    batches.push(symbols.slice(i, i + QUOTE_BATCH_SIZE));
  }
  const results = await Promise.all(
    batches.map((batch) =>
      fyersGet(`${FYERS_API_BASE}/quotes`, token, { symbols: batch.join(",") }).catch((e) => {
        console.error("Quotes batch failed:", (e as Error).message);
        return { d: [] };
      })
    )
  );
  const merged: any[] = [];
  for (const r of results as any[]) {
    if (r?.d && Array.isArray(r.d)) merged.push(...r.d);
  }
  return { s: "ok", d: merged };
}

export async function getMarketDepth(token: string, symbol: string): Promise<any> {
  return fyersGet(`${FYERS_API_BASE}/depth`, token, { symbol, ohlcv_flag: "1" });
}

export async function getHistoricalData(
  token: string,
  symbol: string,
  resolution: string,
  dateFrom: number,
  dateTo: number
): Promise<any> {
  return fyersGet(`${FYERS_API_BASE}/history`, token, {
    symbol,
    resolution,
    date_format: "0",
    range_from: String(dateFrom),
    range_to: String(dateTo),
    cont_flag: "1",
  });
}

export async function getOptionChain(token: string, symbol: string, strikeCount = 10): Promise<any> {
  return fyersGet(`${FYERS_API_BASE}/options-chain-v3`, token, {
    symbol,
    strikecount: String(strikeCount),
  });
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

// ---- Symbol universes ----

export const BROAD_INDICES = [
  "NSE:NIFTY50-INDEX",
  "NSE:NIFTYNXT50-INDEX",
  "NSE:NIFTY100-INDEX",
  "NSE:NIFTY500-INDEX",
  "NSE:NIFTYMIDCAP100-INDEX",
  "NSE:NIFTYSMALLCAP100-INDEX",
  "BSE:SENSEX-INDEX",
];

export const SECTORAL_INDICES = [
  "NSE:NIFTYBANK-INDEX",
  "NSE:NIFTYIT-INDEX",
  "NSE:NIFTYAUTO-INDEX",
  "NSE:NIFTYPHARMA-INDEX",
  "NSE:NIFTYFMCG-INDEX",
  "NSE:NIFTYMETAL-INDEX",
  "NSE:NIFTYREALTY-INDEX",
  "NSE:NIFTYFINSERVICE-INDEX",
  "NSE:NIFTYPSUBANK-INDEX",
  "NSE:NIFTYENERGY-INDEX",
  "NSE:NIFTYINFRA-INDEX",
  "NSE:NIFTYMEDIA-INDEX",
  "NSE:NIFTYCONSUMERDURABLES-INDEX",
  "NSE:NIFTYHEALTHCARE-INDEX",
  "NSE:NIFTYPVTBANK-INDEX",
  "NSE:NIFTYOILGAS-INDEX",
];

export const NIFTY_SYMBOLS = [...BROAD_INDICES, ...SECTORAL_INDICES];

export const INDIA_VIX = "NSE:INDIAVIX-INDEX";
export const NIFTY_INDEX = "NSE:NIFTY50-INDEX";
export const BANKNIFTY_INDEX = "NSE:NIFTYBANK-INDEX";

// All 50 Nifty 50 components (as of 2026)
export const NIFTY50_COMPONENTS = [
  "NSE:RELIANCE-EQ", "NSE:TCS-EQ", "NSE:HDFCBANK-EQ", "NSE:INFY-EQ", "NSE:ICICIBANK-EQ",
  "NSE:HINDUNILVR-EQ", "NSE:ITC-EQ", "NSE:SBIN-EQ", "NSE:BHARTIARTL-EQ", "NSE:KOTAKBANK-EQ",
  "NSE:LT-EQ", "NSE:HCLTECH-EQ", "NSE:AXISBANK-EQ", "NSE:ASIANPAINT-EQ", "NSE:MARUTI-EQ",
  "NSE:BAJFINANCE-EQ", "NSE:SUNPHARMA-EQ", "NSE:WIPRO-EQ", "NSE:TITAN-EQ", "NSE:ULTRACEMCO-EQ",
  "NSE:NESTLEIND-EQ", "NSE:ONGC-EQ", "NSE:NTPC-EQ", "NSE:POWERGRID-EQ", "NSE:M&M-EQ",
  "NSE:TATAMOTORS-EQ", "NSE:TECHM-EQ", "NSE:JSWSTEEL-EQ", "NSE:COALINDIA-EQ", "NSE:ADANIENT-EQ",
  "NSE:HINDALCO-EQ", "NSE:DRREDDY-EQ", "NSE:CIPLA-EQ", "NSE:GRASIM-EQ", "NSE:BAJAJFINSV-EQ",
  "NSE:TATASTEEL-EQ", "NSE:INDUSINDBK-EQ", "NSE:ADANIPORTS-EQ", "NSE:BRITANNIA-EQ", "NSE:DIVISLAB-EQ",
  "NSE:BAJAJ-AUTO-EQ", "NSE:HEROMOTOCO-EQ", "NSE:EICHERMOT-EQ", "NSE:UPL-EQ", "NSE:APOLLOHOSP-EQ",
  "NSE:LTIM-EQ", "NSE:BPCL-EQ", "NSE:TATACONSUM-EQ", "NSE:HDFCLIFE-EQ", "NSE:SBILIFE-EQ",
];

// Backward-compat alias used by routes
export const TOP_STOCKS = NIFTY50_COMPONENTS.slice(0, 10);

export const STOCK_META: Record<string, { name: string; sector: string }> = {
  "NSE:RELIANCE-EQ": { name: "Reliance Industries", sector: "Oil & Gas" },
  "NSE:TCS-EQ": { name: "Tata Consultancy Services", sector: "IT" },
  "NSE:HDFCBANK-EQ": { name: "HDFC Bank", sector: "Banking" },
  "NSE:INFY-EQ": { name: "Infosys", sector: "IT" },
  "NSE:ICICIBANK-EQ": { name: "ICICI Bank", sector: "Banking" },
  "NSE:HINDUNILVR-EQ": { name: "Hindustan Unilever", sector: "FMCG" },
  "NSE:ITC-EQ": { name: "ITC", sector: "FMCG" },
  "NSE:SBIN-EQ": { name: "State Bank of India", sector: "PSU Bank" },
  "NSE:BHARTIARTL-EQ": { name: "Bharti Airtel", sector: "Telecom" },
  "NSE:KOTAKBANK-EQ": { name: "Kotak Mahindra Bank", sector: "Banking" },
  "NSE:LT-EQ": { name: "Larsen & Toubro", sector: "Infrastructure" },
  "NSE:HCLTECH-EQ": { name: "HCL Technologies", sector: "IT" },
  "NSE:AXISBANK-EQ": { name: "Axis Bank", sector: "Banking" },
  "NSE:ASIANPAINT-EQ": { name: "Asian Paints", sector: "Paints" },
  "NSE:MARUTI-EQ": { name: "Maruti Suzuki", sector: "Auto" },
  "NSE:BAJFINANCE-EQ": { name: "Bajaj Finance", sector: "Financial Services" },
  "NSE:SUNPHARMA-EQ": { name: "Sun Pharmaceutical", sector: "Pharma" },
  "NSE:WIPRO-EQ": { name: "Wipro", sector: "IT" },
  "NSE:TITAN-EQ": { name: "Titan Company", sector: "Consumer Durables" },
  "NSE:ULTRACEMCO-EQ": { name: "UltraTech Cement", sector: "Cement" },
  "NSE:NESTLEIND-EQ": { name: "Nestle India", sector: "FMCG" },
  "NSE:ONGC-EQ": { name: "ONGC", sector: "Oil & Gas" },
  "NSE:NTPC-EQ": { name: "NTPC", sector: "Power" },
  "NSE:POWERGRID-EQ": { name: "Power Grid", sector: "Power" },
  "NSE:M&M-EQ": { name: "Mahindra & Mahindra", sector: "Auto" },
  "NSE:TATAMOTORS-EQ": { name: "Tata Motors", sector: "Auto" },
  "NSE:TECHM-EQ": { name: "Tech Mahindra", sector: "IT" },
  "NSE:JSWSTEEL-EQ": { name: "JSW Steel", sector: "Metals" },
  "NSE:COALINDIA-EQ": { name: "Coal India", sector: "Mining" },
  "NSE:ADANIENT-EQ": { name: "Adani Enterprises", sector: "Conglomerate" },
  "NSE:HINDALCO-EQ": { name: "Hindalco Industries", sector: "Metals" },
  "NSE:DRREDDY-EQ": { name: "Dr. Reddy's Labs", sector: "Pharma" },
  "NSE:CIPLA-EQ": { name: "Cipla", sector: "Pharma" },
  "NSE:GRASIM-EQ": { name: "Grasim Industries", sector: "Cement" },
  "NSE:BAJAJFINSV-EQ": { name: "Bajaj Finserv", sector: "Financial Services" },
  "NSE:TATASTEEL-EQ": { name: "Tata Steel", sector: "Metals" },
  "NSE:INDUSINDBK-EQ": { name: "IndusInd Bank", sector: "Banking" },
  "NSE:ADANIPORTS-EQ": { name: "Adani Ports", sector: "Infrastructure" },
  "NSE:BRITANNIA-EQ": { name: "Britannia Industries", sector: "FMCG" },
  "NSE:DIVISLAB-EQ": { name: "Divi's Laboratories", sector: "Pharma" },
  "NSE:BAJAJ-AUTO-EQ": { name: "Bajaj Auto", sector: "Auto" },
  "NSE:HEROMOTOCO-EQ": { name: "Hero MotoCorp", sector: "Auto" },
  "NSE:EICHERMOT-EQ": { name: "Eicher Motors", sector: "Auto" },
  "NSE:UPL-EQ": { name: "UPL", sector: "Chemicals" },
  "NSE:APOLLOHOSP-EQ": { name: "Apollo Hospitals", sector: "Healthcare" },
  "NSE:LTIM-EQ": { name: "LTIMindtree", sector: "IT" },
  "NSE:BPCL-EQ": { name: "BPCL", sector: "Oil & Gas" },
  "NSE:TATACONSUM-EQ": { name: "Tata Consumer Products", sector: "FMCG" },
  "NSE:HDFCLIFE-EQ": { name: "HDFC Life Insurance", sector: "Insurance" },
  "NSE:SBILIFE-EQ": { name: "SBI Life Insurance", sector: "Insurance" },
};

export const SECTOR_INDEX_LABEL: Record<string, string> = {
  "NSE:NIFTYBANK-INDEX": "Bank Nifty",
  "NSE:NIFTYIT-INDEX": "IT",
  "NSE:NIFTYAUTO-INDEX": "Auto",
  "NSE:NIFTYPHARMA-INDEX": "Pharma",
  "NSE:NIFTYFMCG-INDEX": "FMCG",
  "NSE:NIFTYMETAL-INDEX": "Metals",
  "NSE:NIFTYREALTY-INDEX": "Realty",
  "NSE:NIFTYFINSERVICE-INDEX": "Fin Services",
  "NSE:NIFTYPSUBANK-INDEX": "PSU Bank",
  "NSE:NIFTYENERGY-INDEX": "Energy",
  "NSE:NIFTYINFRA-INDEX": "Infra",
  "NSE:NIFTYMEDIA-INDEX": "Media",
  "NSE:NIFTYCONSUMERDURABLES-INDEX": "Cons Durables",
  "NSE:NIFTYHEALTHCARE-INDEX": "Healthcare",
  "NSE:NIFTYPVTBANK-INDEX": "Pvt Bank",
  "NSE:NIFTYOILGAS-INDEX": "Oil & Gas",
};

export const INDEX_LABEL: Record<string, string> = {
  ...SECTOR_INDEX_LABEL,
  "NSE:NIFTY50-INDEX": "NIFTY 50",
  "NSE:NIFTYNXT50-INDEX": "NIFTY NEXT 50",
  "NSE:NIFTY100-INDEX": "NIFTY 100",
  "NSE:NIFTY500-INDEX": "NIFTY 500",
  "NSE:NIFTYMIDCAP100-INDEX": "NIFTY MIDCAP",
  "NSE:NIFTYSMALLCAP100-INDEX": "NIFTY SMALLCAP",
  "BSE:SENSEX-INDEX": "SENSEX",
  "NSE:INDIAVIX-INDEX": "INDIA VIX",
};
