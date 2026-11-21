import { env } from "../lib/env";

const CTRADER_AUTHORIZE_URL = "https://id.ctrader.com/my/settings/openapi/grantingaccess/";
const CTRADER_TOKEN_URL = "https://openapi.ctrader.com/apps/token";

export type CTraderScope = "accounts" | "trading";

export type CTraderTokenResponse = {
  accessToken: string;
  tokenType: "bearer";
  expiresIn: number;
  refreshToken: string;
};

function getCTraderConfig() {
  const clientId = process.env.CTRADER_CLIENT_ID;
  const clientSecret = process.env.CTRADER_CLIENT_SECRET;
  const redirectUri = process.env.CTRADER_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("cTrader Open API is not configured");
  }
  const redirect = new URL(redirectUri);
  if (redirect.protocol !== "https:" && redirect.hostname !== "localhost") {
    throw new Error("cTrader redirect URI must use HTTPS");
  }
  return { clientId, clientSecret, redirectUri };
}

/** Build the vendor-hosted consent URL. Never request trading scope by default. */
export function buildCTraderAuthorizationUrl(scope: CTraderScope = "accounts"): string {
  const { clientId, redirectUri } = getCTraderConfig();
  const url = new URL(CTRADER_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("product", "web");
  return url.toString();
}

async function requestToken(params: URLSearchParams): Promise<CTraderTokenResponse> {
  const { clientId, clientSecret } = getCTraderConfig();
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);

  const response = await fetch(`${CTRADER_TOKEN_URL}?${params.toString()}`, {
    method: "GET",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`cTrader token exchange failed with HTTP ${response.status}`);

  const data = await response.json() as Record<string, unknown>;
  if (
    typeof data.accessToken !== "string" ||
    typeof data.refreshToken !== "string" ||
    data.tokenType !== "bearer" ||
    typeof data.expiresIn !== "number" ||
    data.errorCode
  ) {
    throw new Error("cTrader returned an invalid token response");
  }
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    tokenType: "bearer",
    expiresIn: data.expiresIn,
  };
}

/** Authorization codes expire quickly; exchange immediately on the server. */
export async function exchangeCTraderAuthorizationCode(code: string): Promise<CTraderTokenResponse> {
  if (!code || code.length > 2048) throw new Error("Invalid cTrader authorization code");
  const { redirectUri } = getCTraderConfig();
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  return requestToken(params);
}

export async function refreshCTraderAccessToken(refreshToken: string): Promise<CTraderTokenResponse> {
  if (!refreshToken || refreshToken.length > 4096) throw new Error("Invalid cTrader refresh token");
  return requestToken(new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }));
}
