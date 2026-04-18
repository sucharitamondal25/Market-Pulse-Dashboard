import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.resolve(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "market.db");

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

const migrate = db.transaction(() => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id          INTEGER PRIMARY KEY DEFAULT 1,
      access_token TEXT NOT NULL,
      expires_at  INTEGER NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS ohlcv_cache (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol      TEXT NOT NULL,
      resolution  TEXT NOT NULL,
      ts          INTEGER NOT NULL,
      open        REAL NOT NULL,
      high        REAL NOT NULL,
      low         REAL NOT NULL,
      close       REAL NOT NULL,
      volume      INTEGER NOT NULL,
      fetched_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(symbol, resolution, ts)
    );
    CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_res ON ohlcv_cache(symbol, resolution, ts DESC);

    CREATE TABLE IF NOT EXISTS watchlist (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol      TEXT NOT NULL UNIQUE,
      name        TEXT,
      sector      TEXT,
      added_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS screener_criteria (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      config      TEXT NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS screener_results (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      criteria_id INTEGER REFERENCES screener_criteria(id) ON DELETE CASCADE,
      symbol      TEXT NOT NULL,
      price       REAL,
      change_pct  REAL,
      score       REAL,
      matched_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_screener_results_criteria ON screener_results(criteria_id, matched_at DESC);

    CREATE TABLE IF NOT EXISTS backtest_runs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      strategy      TEXT NOT NULL,
      symbol        TEXT NOT NULL,
      from_date     TEXT NOT NULL,
      to_date       TEXT NOT NULL,
      initial_capital REAL NOT NULL DEFAULT 100000,
      result        TEXT,
      status        TEXT NOT NULL DEFAULT 'pending',
      created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      completed_at  INTEGER
    );

    CREATE TABLE IF NOT EXISTS backtest_trades (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id        INTEGER NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
      entry_ts      INTEGER NOT NULL,
      exit_ts       INTEGER,
      entry_price   REAL NOT NULL,
      exit_price    REAL,
      qty           INTEGER NOT NULL,
      side          TEXT NOT NULL CHECK(side IN ('LONG','SHORT')),
      pnl           REAL,
      pnl_pct       REAL
    );
    CREATE INDEX IF NOT EXISTS idx_backtest_trades_run ON backtest_trades(run_id);

    CREATE TABLE IF NOT EXISTS alerts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol      TEXT NOT NULL,
      type        TEXT NOT NULL,
      condition   TEXT NOT NULL,
      value       REAL NOT NULL,
      message     TEXT,
      triggered   INTEGER NOT NULL DEFAULT 0,
      triggered_at INTEGER,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS orders (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      fyers_order_id TEXT,
      symbol        TEXT NOT NULL,
      side          TEXT NOT NULL CHECK(side IN ('BUY','SELL')),
      qty           INTEGER NOT NULL,
      order_type    TEXT NOT NULL,
      limit_price   REAL,
      stop_price    REAL,
      status        TEXT NOT NULL DEFAULT 'PENDING',
      filled_price  REAL,
      filled_qty    INTEGER,
      source        TEXT NOT NULL DEFAULT 'manual',
      strategy      TEXT,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol, created_at DESC);

    CREATE TABLE IF NOT EXISTS quote_snapshots (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol      TEXT NOT NULL,
      lp          REAL,
      open        REAL,
      high        REAL,
      low         REAL,
      close       REAL,
      chp         REAL,
      vol         INTEGER,
      snapped_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_symbol ON quote_snapshots(symbol, snapped_at DESC);
  `);
});

migrate();

export function tokenSave(token: string, expiresAt: number): void {
  db.prepare(`
    INSERT INTO tokens (id, access_token, expires_at)
    VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET access_token = excluded.access_token, expires_at = excluded.expires_at, created_at = unixepoch()
  `).run(token, expiresAt);
}

export function tokenGet(): { token: string; expiresAt: number } | null {
  const row = db.prepare("SELECT access_token, expires_at FROM tokens WHERE id = 1").get() as
    | { access_token: string; expires_at: number }
    | undefined;
  if (!row) return null;
  return { token: row.access_token, expiresAt: row.expires_at };
}

export function ohlcvUpsert(
  symbol: string,
  resolution: string,
  candles: Array<[number, number, number, number, number, number]>
): void {
  const stmt = db.prepare(`
    INSERT INTO ohlcv_cache (symbol, resolution, ts, open, high, low, close, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, resolution, ts) DO UPDATE SET
      open = excluded.open, high = excluded.high, low = excluded.low,
      close = excluded.close, volume = excluded.volume, fetched_at = unixepoch()
  `);
  const insert = db.transaction((rows: typeof candles) => {
    for (const [ts, o, h, l, c, v] of rows) {
      stmt.run(symbol, resolution, ts, o, h, l, c, v);
    }
  });
  insert(candles);
}

export function ohlcvGet(
  symbol: string,
  resolution: string,
  from: number,
  to: number
): Array<[number, number, number, number, number, number]> {
  return db
    .prepare(
      "SELECT ts, open, high, low, close, volume FROM ohlcv_cache WHERE symbol = ? AND resolution = ? AND ts >= ? AND ts <= ? ORDER BY ts ASC"
    )
    .all(symbol, resolution, from, to) as any;
}

export function ohlcvLatestTs(symbol: string, resolution: string): number | null {
  const row = db
    .prepare("SELECT MAX(ts) as latest FROM ohlcv_cache WHERE symbol = ? AND resolution = ?")
    .get(symbol, resolution) as { latest: number | null } | undefined;
  return row?.latest ?? null;
}

export function snapshotSave(symbol: string, q: Record<string, number>): void {
  db.prepare(`
    INSERT INTO quote_snapshots (symbol, lp, open, high, low, close, chp, vol)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(symbol, q.lp ?? null, q.open ?? null, q.high ?? null, q.low ?? null, q.prev_close_price ?? null, q.chp ?? null, q.volume ?? null);
}

export function alertsList(): any[] {
  return db.prepare("SELECT * FROM alerts ORDER BY created_at DESC").all() as any[];
}

export function alertCreate(alert: {
  symbol: string;
  type: string;
  condition: string;
  value: number;
  message?: string;
}): number {
  const res = db
    .prepare("INSERT INTO alerts (symbol, type, condition, value, message) VALUES (?, ?, ?, ?, ?)")
    .run(alert.symbol, alert.type, alert.condition, alert.value, alert.message ?? null);
  return Number(res.lastInsertRowid);
}

export function alertTrigger(id: number): void {
  db.prepare("UPDATE alerts SET triggered = 1, triggered_at = unixepoch() WHERE id = ?").run(id);
}

export function watchlistGet(): any[] {
  return db.prepare("SELECT * FROM watchlist ORDER BY added_at DESC").all() as any[];
}

export function watchlistAdd(symbol: string, name?: string, sector?: string): void {
  db.prepare("INSERT OR IGNORE INTO watchlist (symbol, name, sector) VALUES (?, ?, ?)").run(
    symbol, name ?? null, sector ?? null
  );
}

export function watchlistRemove(symbol: string): void {
  db.prepare("DELETE FROM watchlist WHERE symbol = ?").run(symbol);
}

export function orderCreate(order: {
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  orderType: string;
  limitPrice?: number;
  stopPrice?: number;
  source?: string;
  strategy?: string;
  fyersOrderId?: string;
}): number {
  const res = db.prepare(`
    INSERT INTO orders (symbol, side, qty, order_type, limit_price, stop_price, source, strategy, fyers_order_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    order.symbol, order.side, order.qty, order.orderType,
    order.limitPrice ?? null, order.stopPrice ?? null,
    order.source ?? "manual", order.strategy ?? null,
    order.fyersOrderId ?? null
  );
  return Number(res.lastInsertRowid);
}

export function ordersList(limit = 50): any[] {
  return db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT ?").all(limit) as any[];
}

export function backtestCreate(run: {
  name: string;
  strategy: string;
  symbol: string;
  fromDate: string;
  toDate: string;
  initialCapital: number;
}): number {
  const res = db.prepare(`
    INSERT INTO backtest_runs (name, strategy, symbol, from_date, to_date, initial_capital)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(run.name, run.strategy, run.symbol, run.fromDate, run.toDate, run.initialCapital);
  return Number(res.lastInsertRowid);
}

export function backtestComplete(id: number, result: object): void {
  db.prepare("UPDATE backtest_runs SET status = 'done', result = ?, completed_at = unixepoch() WHERE id = ?")
    .run(JSON.stringify(result), id);
}

export function backtestList(): any[] {
  return db.prepare("SELECT id, name, strategy, symbol, from_date, to_date, initial_capital, status, created_at, completed_at FROM backtest_runs ORDER BY created_at DESC").all() as any[];
}

export function backtestGet(id: number): any {
  return db.prepare("SELECT * FROM backtest_runs WHERE id = ?").get(id) as any;
}
