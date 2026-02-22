import { getSheetsClient, getEnv, requireApiKey, readJson } from "../lib/sheets.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    requireApiKey(req);

    const body = await readJson(req);
    const {
      limit = 200,
      offset = 0,
      include_text = true
    } = body || {};

    const SPREADSHEET_ID = getEnv("SPREADSHEET_ID");
    const OFFERS_SHEET_NAME = getEnv("OFFERS_SHEET_NAME");

    const sheets = getSheetsClient();

    // Можно A:L (как на скрине), или A:Z. A:L чуть аккуратнее.
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${OFFERS_SHEET_NAME}!A:L`
    });

    const rows = resp.data.values || [];
    if (!rows.length) {
      return res.json({ offers: [], total_rows: 0, offset: 0, limit: 0 });
    }

    const header = rows[0].map((h) => (h || "").trim());

    const offers = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];

      // пропускаем полностью пустые строки (на всякий)
      if (!row || row.every((v) => String(v ?? "").trim() === "")) continue;

      const obj = {};
      for (let i = 0; i < header.length; i++) {
        const key = header[i];
        if (!include_text && key === "text") continue;
        obj[key] = row[i] ?? "";
      }
      obj.row_number = r + 1; // удобно ссылаться при выдаче мэтчей
      offers.push(obj);
    }

    const start = Math.max(0, offset);
    const end = Math.min(offers.length, start + Math.max(1, Math.min(1000, limit)));

    return res.json({
      offers: offers.slice(start, end),
      total_rows: offers.length,
      offset: start,
      limit: end - start
    });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ error: e.message || "Server error" });
  }
}