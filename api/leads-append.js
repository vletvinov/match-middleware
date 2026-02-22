import { getSheetsClient, getEnv, requireApiKey, readJson } from "../lib/sheets.js";

const COLS = [
  "date",
  "property_type",
  "location",
  "bedrooms",
  "bathrooms",
  "area_sqm",
  "price_thb",
  "contract_group",
  "contract_months",
  "text",
  "source"
];

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    requireApiKey(req);

    const body = await readJson(req);
    const { source, target, rows } = body;

    if (!source || !Array.isArray(rows) || !target) {
      return res.status(400).json({ error: "source, target (offers|requests) and rows[] required" });
    }

    const SPREADSHEET_ID = getEnv("SPREADSHEET_ID");
    const OFFERS_SHEET_NAME = getEnv("OFFERS_SHEET_NAME");
    const REQUESTS_SHEET_NAME = getEnv("REQUESTS_SHEET_NAME");

    const sheetName =
      target === "offers" ? OFFERS_SHEET_NAME :
      target === "requests" ? REQUESTS_SHEET_NAME :
      null;

    if (!sheetName) return res.status(400).json({ error: "target must be offers or requests" });

    const values = rows.map((r) => {
      const row = { ...r };
      if (!row.source) row.source = source; // <- пишем в последнюю колонку
      return COLS.map((c) => (row[c] === undefined || row[c] === null) ? "" : row[c]);
    });

    const sheets = getSheetsClient();
    const resp = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values }
    });

    const updates = resp?.data?.updates || {};
    res.json({
      appended_rows: updates.updatedRows ?? values.length,
      updated_range: updates.updatedRange ?? null,
      target_sheet: sheetName
    });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || "Server error" });
  }
}