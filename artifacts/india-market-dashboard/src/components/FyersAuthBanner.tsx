interface FyersAuthBannerProps {
  onLogin: () => void;
}

export function FyersAuthBanner({ onLogin }: FyersAuthBannerProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-sm"
      style={{
        background: "rgba(255,145,0,0.08)",
        border: "1px solid rgba(255,145,0,0.25)",
        borderRadius: "4px",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#ff9100]" />
        <span className="text-[11px] text-[#ff9100] font-mono">
          Dashboard is showing simulated data — connect Fyers API for live market data
        </span>
      </div>
      <button
        onClick={onLogin}
        className="text-[10px] font-bold px-3 py-1 rounded font-mono transition-all hover:opacity-90"
        style={{
          background: "rgba(255,145,0,0.15)",
          color: "#ff9100",
          border: "1px solid rgba(255,145,0,0.4)",
        }}
      >
        CONNECT FYERS
      </button>
    </div>
  );
}
