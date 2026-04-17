export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(220,13%,9%)" }}>
      <div className="text-center">
        <h1 className="text-4xl font-bold font-mono" style={{ color: "#ff1744" }}>404</h1>
        <p className="mt-2 text-sm" style={{ color: "hsl(220,10%,55%)" }}>Page not found</p>
      </div>
    </div>
  );
}
