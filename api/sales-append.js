import { getSheetsClient, getEnv, requireApiKey, readJson, SALES_COLS } from "../lib/sheets.js";

function resolveTarget(target) {
  if (target === "obj") return getEnv("OBJ_SHEET_NAME");
  if (target === "buyers") return getEnv("BUYERS_SHEET_NAME");
  const err = new Error("target must be 'obj' or 'buyers'");
  err.statusCode = 400;
  throw err;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    requireApiKey(req);

    const body = await readJson(req);
    const { source, target, rows } = body || {};

    if (!source || !target || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "source, target, rows[] required" });
    }

    const sheetName = resolveTarget(target);
    const spreadsheetId = getEnv("SPREADSHEET_ID");

    const values = rows.map((r) => {
      const row = { ...r };
      if (!row.source) row.source = source;
      return SALES_COLS.map((k) => (row[k] ?? ""));
    });

    const sheets = getSheetsClient();
    const resp = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:J`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    res.json({
      appended_rows: values.length,
      updated_range: resp.data.updates?.updatedRange || "",
      target_sheet: sheetName,
    });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || "Server error" });
  }
}