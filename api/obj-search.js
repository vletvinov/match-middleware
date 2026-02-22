import { getSheetsClient, getEnv, requireApiKey, readJson, SALES_COLS } from "../lib/sheets.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    requireApiKey(req);

    const body = await readJson(req);
    const { limit = 50, offset = 0, include_text = false } = body || {};
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const spreadsheetId = getEnv("SPREADSHEET_ID");
    const sheetName = getEnv("OBJ_SHEET_NAME");

    const sheets = getSheetsClient();
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:J`,
    });

    const rows = resp.data.values || [];
    if (rows.length <= 1) return res.json({ obj: [], total_rows: 0, offset: 0, limit: 0 });

    const items = [];
    for (let r = 1; r < rows.length; r++) {
      const raw = rows[r] || [];
      if (raw.every((v) => String(v ?? "").trim() === "")) continue;

      const item = {};
      for (let i = 0; i < SALES_COLS.length; i++) {
        const key = SALES_COLS[i];
        if (!include_text && key === "text") continue;
        item[key] = raw[i] ?? "";
      }
      item.row_number = r + 1;
      items.push(item);
    }

    const start = safeOffset;
    const end = Math.min(items.length, start + safeLimit);

    res.json({
      obj: items.slice(start, end),
      total_rows: items.length,
      offset: start,
      limit: end - start,
    });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || "Server error" });
  }
}