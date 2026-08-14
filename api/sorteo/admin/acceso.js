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
    const allowed = String(process.env.GIVEAWAY_ADMIN_EMAILS || "")
      .split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (!email || !email.includes("@")) return json(response, 400, { error: "INVALID_EMAIL" });

    // Always return the same public response to avoid revealing the admin allowlist.
    if (!allowed.includes(email)) return json(response, 202, { ok: true });

    const protocol = request.headers["x-forwarded-proto"] || "https";
    const redirectTo = `${protocol}://${request.headers.host}/gestion/sorteos/ep03`;
    const authResponse = await fetch(`${config.supabaseUrl}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: "POST",
      headers: { apikey: config.supabaseKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, create_user: true, data: {}, gotrue_meta_security: {} }),
    });
    if (!authResponse.ok) return json(response, 502, { error: "AUTH_EMAIL_FAILED" });
    return json(response, 202, { ok: true });
  } catch (_) {
    return json(response, 400, { error: "INVALID_REQUEST" });
  }
};
