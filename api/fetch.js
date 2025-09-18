// api/fetch.js
export default async function handler(req, res) {
  try {
    let { url } = req.query;
    if (!url) {
      res.status(400).json({ error: "missing url" });
      return;
    }

    // --- 1) yanoshin の rd.php 経由URLなら、直リンクを抽出 ---
    // ex) https://webapi.yanoshin.jp/rd.php?https://www.release.tdnet.info/inbs/XXXX.zip
    const m = url.match(/^https?:\/\/webapi\.yanoshin\.jp\/rd\.php\?(.*)$/i);
    if (m && m[1]) {
      url = decodeURIComponent(m[1]);
    }

    // ダウンロード用ヘッダ（UA/Referer は多めに）
    const baseHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Referer": "https://www.release.tdnet.info/",
    };

    // --- 2) まず直リンクでトライ（リダイレクト追随） ---
    let r = await fetch(url, { headers: baseHeaders, redirect: "follow" });

    // --- 3) 直リンクが 404/403 などなら、rd.php 経由でも再トライ ---
    if (!r.ok) {
      const viaYanoshin = `https://webapi.yanoshin.jp/rd.php?${encodeURIComponent(url)}`;
      r = await fetch(viaYanoshin, { headers: baseHeaders, redirect: "follow" });
    }

    // それでもダメならエラー返す
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      res.status(r.status).json({
        error: "upstream_not_ok",
        status: r.status,
        upstream_body_head: text.slice(0, 400),
      });
      return;
    }

    // 成功時：そのまま転送
    const contentType = r.headers.get("content-type") || "application/octet-stream";
    const buf = Buffer.from(await r.arrayBuffer());
    const name = (url.split("/").pop() || "file").split("?")[0];

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${name}"`);
    // CORS が欲しい場合（任意）
    res.setHeader("Access-Control-Allow-Origin", "*");

    res.status(200).send(buf);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
