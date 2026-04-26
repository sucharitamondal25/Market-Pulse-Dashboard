interface FyersAuthBannerProps {
  authUrl: string | null;
  pending: boolean;
  error: string | null;
  onStartLogin: () => void;
  onCheckNow: () => void;
  onCancel: () => void;
}

export function FyersAuthBanner({
  authUrl,
  pending,
  error,
  onStartLogin,
  onCheckNow,
  onCancel,
}: FyersAuthBannerProps) {
  const accent = error ? "#ff1744" : pending ? "#40c4ff" : "#ff9100";
  const message = error
    ? error
    : pending
    ? "A new tab opened — sign in to Fyers there. We'll auto-detect when you're done."
    : "Dashboard is showing simulated data — connect Fyers API for live market data";

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-sm gap-3"
      style={{
        background: `${accent}14`,
        border: `1px solid ${accent}40`,
        borderRadius: "4px",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${pending ? "live-dot" : ""}`}
          style={{ background: accent }}
        />
        <span className="text-[11px] font-mono truncate" style={{ color: accent }}>
          {message}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {pending ? (
          <>
            <button
              onClick={onCheckNow}
              className="text-[10px] font-bold px-3 py-1 rounded font-mono transition-all hover:opacity-90"
              style={{
                background: `${accent}26`,
                color: accent,
                border: `1px solid ${accent}66`,
              }}
            >
              I'M DONE — CHECK NOW
            </button>
            <button
              onClick={onCancel}
              className="text-[10px] font-bold px-3 py-1 rounded font-mono transition-all hover:opacity-90"
              style={{
                background: "transparent",
                color: "hsl(220,10%,55%)",
                border: "1px solid hsl(220,10%,25%)",
              }}
            >
              CANCEL
            </button>
          </>
        ) : authUrl ? (
          <a
            href={authUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onStartLogin}
            className="text-[10px] font-bold px-3 py-1 rounded font-mono transition-all hover:opacity-90 inline-block"
            style={{
              background: `${accent}26`,
              color: accent,
              border: `1px solid ${accent}66`,
              textDecoration: "none",
            }}
          >
            {error ? "RETRY LOGIN ↗" : "CONNECT FYERS ↗"}
          </a>
        ) : (
          <span className="text-[10px] font-mono" style={{ color: accent }}>
            Loading auth URL...
          </span>
        )}
      </div>
    </div>
  );
}
