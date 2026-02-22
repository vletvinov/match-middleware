import { getSheetsClient, getEnv, requireApiKey, readJson, SALES_COLS } from "../lib/sheets.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    requireApiKey(req);

    const body = await readJson(req);
    const { row_numbers, include_text = true } = body || {};
    if (!Array.isArray(row_numbers) || row_numbers.length === 0) {
      return res.status(400).json({ error: "row_numbers[] required" });
    }

    const spreadsheetId = getEnv("SPREADSHEET_ID");
    const sheetName = getEnv("OBJ_SHEET_NAME");

    const unique = [...new Set(row_numbers.map(Number).filter((n) => Number.isFinite(n) && n >= 2))].slice(0, 20);

    const sheets = getSheetsClient();
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:J`,
    });

    const rows = resp.data.values || [];
    const out = [];

    for (const rn of unique) {
      const idx = rn - 1;
      if (idx <= 0 || idx >= rows.length) continue;

      const raw = rows[idx] || [];
      const item = {};
      for (let i = 0; i < SALES_COLS.length; i++) {
        const key = SALES_COLS[i];
        if (!include_text && key === "text") continue;
        item[key] = raw[i] ?? "";
      }
      item.row_number = rn;
      out.push(item);
    }

    res.json({ obj: out });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || "Server error" });
  }
}