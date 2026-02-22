import { getSheetsClient, getEnv, requireApiKey, readJson } from "../lib/sheets.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    requireApiKey(req);

    const body = await readJson(req);
    const { limit = 50, offset = 0, include_text = false } = body || {};

    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const SPREADSHEET_ID = getEnv("SPREADSHEET_ID");
    const REQUESTS_SHEET_NAME = getEnv("REQUESTS_SHEET_NAME");

    const sheets = getSheetsClient();
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${REQUESTS_SHEET_NAME}!A:K`
    });

    const rows = resp.data.values || [];
    if (!rows.length) return res.json({ requests: [], total_rows: 0, offset: 0, limit: 0 });

    const header = rows[0].map((h) => (h || "").trim());

    const items = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((v) => String(v ?? "").trim() === "")) continue;

      const obj = {};
      for (let i = 0; i < header.length; i++) {
        const key = header[i];
        if (!include_text && key === "text") continue;
        obj[key] = row[i] ?? "";
      }
      obj.row_number = r + 1;
      items.push(obj);
    }

    const start = safeOffset;
    const end = Math.min(items.length, start + safeLimit);

    res.json({
      requests: items.slice(start, end),
      total_rows: items.length,
      offset: start,
      limit: end - start
    });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || "Server error" });
  }
}