import { defineSecret } from "firebase-functions/params";
import { Request, Response } from "express";
import { logger } from "firebase-functions";

// Define secrets - set via: firebase functions:secrets:set SECRET_NAME
export const googleClientId = defineSecret("GOOGLE_CLIENT_ID");
export const googleClientSecret = defineSecret("GOOGLE_CLIENT_SECRET");

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Exchanges an authorization code for access and refresh tokens
 */
export async function exchangeToken(req: Request, res: Response): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { code, redirectUri } = req.body;

  if (!code || !redirectUri) {
    res.status(400).json({ error: "Missing required parameters: code, redirectUri" });
    return;
  }

  try {
    // Try secret first, fallback to env var for debugging
    // IMPORTANT: trim() to remove any trailing newlines from secrets
    let clientId = googleClientId.value()?.trim() || "";
    let clientSecret = googleClientSecret.value()?.trim() || "";

    // Fallback to process.env if secrets are empty
    if (!clientId) {
      clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
    }
    if (!clientSecret) {
      clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
    }

    logger.info("OAuth exchange request", {
      clientIdLength: clientId?.length || 0,
      clientIdPrefix: clientId?.substring(0, 20) || "EMPTY",
      clientSecretLength: clientSecret?.length || 0,
      redirectUri: redirectUri,
      fromSecret: (googleClientId.value()?.length || 0) > 0,
    });

    if (!clientId || !clientSecret) {
      logger.error("OAuth client credentials missing", {
        hasClientId: Boolean(clientId),
        hasClientSecret: Boolean(clientSecret),
      });
      res.status(500).json({ error: "OAuth client not configured" });
      return;
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Token exchange failed", {
        status: response.status,
        error,
      });
      res.status(response.status).json({ error: "Token exchange failed" });
      return;
    }

    const tokenData = await response.json();

    // Return tokens to client (don't expose client secret)
    res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
    });
  } catch (error) {
    logger.error("OAuth exchange error", { error });
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Refreshes an expired access token using a refresh token
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { refreshToken: token } = req.body;

  if (!token) {
    res.status(400).json({ error: "Missing required parameter: refreshToken" });
    return;
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: googleClientId.value()?.trim() || "",
        client_secret: googleClientSecret.value()?.trim() || "",
        refresh_token: token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Token refresh failed", {
        status: response.status,
        error,
      });
      res.status(response.status).json({ error: "Token refresh failed" });
      return;
    }

    const tokenData = await response.json();

    res.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
    });
  } catch (error) {
    logger.error("OAuth refresh error", { error });
    res.status(500).json({ error: "Internal server error" });
  }
}
