"use strict";

const { getConfig, isConfigured, json, readJson, sameOrigin } = require("../../_lib/sorteo");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  if (!sameOrigin(request)) return json(response, 403, { error: "ORIGIN_NOT_ALLOWED" });
  const config = getConfig();
  if (!isConfigured(config)) return json(response, 503, { error: "SERVICE_NOT_CONFIGURED" });
  try {
    const body = await readJson(request, 3_000);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const allowed = String(config.adminEmails || "")
      .split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (!email || !email.includes("@") || password.length < 8) {
      return json(response, 401, { error: "INVALID_ACCESS" });
    }

    // Keep the same response for unknown emails and invalid credentials.
    if (!allowed.includes(email)) return json(response, 401, { error: "INVALID_ACCESS" });

    const authResponse = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: config.supabaseKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!authResponse.ok) return json(response, 401, { error: "INVALID_ACCESS" });
    const auth = await authResponse.json();
    if (String(auth.user?.email || "").toLowerCase() !== email || !auth.access_token || !auth.refresh_token) {
      return json(response, 401, { error: "INVALID_ACCESS" });
    }
    return json(response, 200, {
      accessToken: auth.access_token,
      refreshToken: auth.refresh_token,
      expiresIn: Number(auth.expires_in || 3600),
    });
  } catch (_) {
    return json(response, 400, { error: "INVALID_REQUEST" });
  }
};
