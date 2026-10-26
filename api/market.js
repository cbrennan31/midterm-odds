// Vercel serverless function: GET /api/markets?event_ticker=SENATETX-26
// Read-only proxy for Kalshi public market data, with CORS headers.
const UPSTREAMS = [
  "https://external-api.kalshi.com/trade-api/v2",
  "https://api.elections.kalshi.com/trade-api/v2",
];

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();

  const ticker = String(req.query.event_ticker || "");
  if (req.method !== "GET" || !/^[A-Za-z0-9_-]{3,60}$/.test(ticker)) {
    return res.status(400).json({ error: "Use GET /api/markets?event_ticker=TICKER" });
  }

  let last = null;
  for (const base of UPSTREAMS) {
    try {
      const r = await fetch(`${base}/markets?event_ticker=${encodeURIComponent(ticker)}&limit=50`, {
        headers: { Accept: "application/json", "User-Agent": "midterm-odds-proxy/1.0" },
      });
      if (r.ok) {
        const data = await r.json();
        res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=30");
        return res.status(200).json(data);
      }
      last = `${base} -> HTTP ${r.status}`;
    } catch (e) {
      last = `${base} -> ${e.message}`;
    }
  }
  return res.status(502).json({ error: "Upstream failed", detail: last });
};
