import { getSheetsClient, getEnv, requireApiKey, readJson } from "../lib/sheets.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    requireApiKey(req);

    const body = await readJson(req);
    const { row_numbers, include_text = true } = body || {};

    if (!Array.isArray(row_numbers) || row_numbers.length === 0) {
      return res.status(400).json({ error: "row_numbers[] required" });
    }

    const unique = [...new Set(row_numbers.map(n => Number(n)).filter(n => Number.isFinite(n) && n >= 2))].slice(0, 20);

    const SPREADSHEET_ID = getEnv("SPREADSHEET_ID");
    const REQUESTS_SHEET_NAME = getEnv("REQUESTS_SHEET_NAME");

    const sheets = getSheetsClient();
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${REQUESTS_SHEET_NAME}!A:K`
    });

    const rows = resp.data.values || [];
    if (!rows.length) return res.json({ requests: [] });

    const header = rows[0].map((h) => (h || "").trim());

    const requests = [];
    for (const rn of unique) {
      const idx = rn - 1;
      if (idx <= 0 || idx >= rows.length) continue;

      const row = rows[idx];
      const obj = {};
      for (let i = 0; i < header.length; i++) {
        const key = header[i];
        if (!include_text && key === "text") continue;
        obj[key] = row[i] ?? "";
      }
      obj.row_number = rn;
      requests.push(obj);
    }

    res.json({ requests });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || "Server error" });
  }
}