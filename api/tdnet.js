// /api/tdnet.js
const base = "https://webapi.yanoshin.jp/webapi/tdnet";

module.exports = async (req, res) => {
  try {
    const { mode, code, start, end } = req.query;
    const limit = req.query.limit ?? "50";
    const hasXBRL = req.query.hasXBRL ?? "1";

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
      redirect: "manual"
    });

    const text = await r.text();
    // Yanoshin は Content-Type: text/html を返すことがあるので、強制的に JSON で返す
    try {
      const data = JSON.parse(text);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(200).json(data);
    } catch {
      // JSONじゃない・ブロック/リダイレクト時の可視化
      return res.status(502).json({
        upstream_status: r.status,
        content_type: r.headers.get("content-type") || "unknown",
        body_head: text.slice(0, 500)
      });
    }
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
