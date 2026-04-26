interface FyersAuthBannerProps {
  onLogin: () => void;
  pending?: boolean;
  error?: string | null;
}

export function FyersAuthBanner({ onLogin, pending, error }: FyersAuthBannerProps) {
  const accent = error ? "#ff1744" : pending ? "#40c4ff" : "#ff9100";
  const message = error
    ? error
    : pending
    ? "Waiting for Fyers login to complete in popup window..."
    : "Dashboard is showing simulated data — connect Fyers API for live market data";

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-sm"
      style={{
        background: `${accent}14`,
        border: `1px solid ${accent}40`,
        borderRadius: "4px",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${pending ? "live-dot" : ""}`}
          style={{ background: accent }}
        />
        <span className="text-[11px] font-mono" style={{ color: accent }}>
          {message}
        </span>
      </div>
      <button
        onClick={onLogin}
        disabled={pending}
        className="text-[10px] font-bold px-3 py-1 rounded font-mono transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: `${accent}26`,
          color: accent,
          border: `1px solid ${accent}66`,
        }}
      >
        {pending ? "WAITING..." : error ? "RETRY" : "CONNECT FYERS"}
      </button>
    </div>
  );
}
