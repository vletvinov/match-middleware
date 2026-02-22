import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getSheetsClient() {
  const b64 = getEnv("GOOGLE_SA_JSON_B64");
  const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));

  const auth = new google.auth.JWT(sa.client_email, null, sa.private_key, SCOPES);
  return google.sheets({ version: "v4", auth });
}

export function requireApiKey(req) {
  const expected = getEnv("ACTIONS_API_KEY");
  const got = req.headers["x-api-key"];
  if (!got || got !== expected) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}