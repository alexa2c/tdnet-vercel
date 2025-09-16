// GET /api/tdnet?mode=list&code=7203&limit=10&hasXBRL=1
// GET /api/tdnet?mode=range&start=20250909&end=20250914&limit=100&hasXBRL=1
export default async function handler(req, res) {
  try {
    const { mode, code, start, end } = req.query;
    const limit = req.query.limit ?? "50";
    const hasXBRL = req.query.hasXBRL ?? "1";

    const base = "https://webapi.yanoshin.jp/webapi/tdnet";
    let target;

    if (mode === "list") {
      if (!code) return res.status(400).json({ error: "missing code" });
      target = `${base}/list/${encodeURIComponent(code)}.json?limit=${encodeURIComponent(limit)}&hasXBRL=${encodeURIComponent(hasXBRL)}`;
    } else if (mode === "range") {
      if (!start || !end) return res.status(400).json({ error: "missing start/end" });
      target = `${base}/list/${encodeURIComponent(start)}-${encodeURIComponent(end)}.json?limit=${encodeURIComponent(limit)}&hasXBRL=${encodeURIComponent(hasXBRL)}`;
    } else {
      return res.status(400).json({ error: "invalid mode" });
    }

    const r = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.release.tdnet.info/",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Connection": "keep-alive"
      },
      redirect: "manual" // リダイレクトは追わず検出
    });

    const ct = r.headers.get("content-type") || "";
    if (r.status >= 300 && r.status < 400) {
      // リダイレクト検出
      return res.status(502).json({ upstream_status: r.status, location: r.headers.get("location") });
    }
    if (!r.ok || !ct.toLowerCase().includes("json")) {
      const text = await r.text();
      return res.status(502).json({
        upstream_status: r.status,
        content_type: ct,
        body_head: text.slice(0, 500)
      });
    }

    const data = await r.json();
    res.setHeader("cache-control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
