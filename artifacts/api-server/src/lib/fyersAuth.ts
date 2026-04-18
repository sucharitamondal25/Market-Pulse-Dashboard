import crypto from "crypto";

const APP_ID = process.env.FYERS_APP_ID!;
const SECRET_KEY = process.env.FYERS_SECRET_KEY!;
const REDIRECT_URI = process.env.FYERS_REDIRECT_URI || `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}/api/fyers/callback`;

export function getFyersAuthUrl(): string {
  const state = crypto.randomBytes(16).toString("hex");
  const url = `https://api-t1.fyers.in/api/v3/generate-authcode?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&state=${state}`;
  return url;
}

export async function exchangeCodeForToken(authCode: string): Promise<string> {
  const appIdHash = crypto.createHash("sha256").update(`${APP_ID}:${SECRET_KEY}`).digest("hex");

  const resp = await fetch("https://api-t1.fyers.in/api/v3/validate-authcode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      appIdHash,
      code: authCode,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  const data = (await resp.json()) as { access_token?: string; message?: string };
  if (!data.access_token) {
    throw new Error(`No access_token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}
