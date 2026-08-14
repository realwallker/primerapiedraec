"use strict";

const { getConfig, json, publicError, readJson, requestFingerprint, rpc, sameOrigin } = require("../_lib/sorteo");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  if (!sameOrigin(request)) return json(response, 403, { error: "ORIGIN_NOT_ALLOWED" });
  const config = getConfig();
  if (!config.hashSecret && !config.isPreview) return json(response, 503, { error: "ANTI_ABUSE_NOT_CONFIGURED" });
  try {
    const body = await readJson(request, 3_000);
    if (body.website) return json(response, 202, { ok: true });
    const result = await rpc("join_giveaway_waitlist", {
      p_campaign_id: config.campaignId,
      p_email: String(body.email || ""),
      p_consent: body.consent === true,
      p_request_hash: requestFingerprint(request),
      p_source: config.isPreview ? "vercel-preview-hub" : "production-hub",
    });
    return json(response, 201, result);
  } catch (error) {
    const code = publicError(error);
    const status = code === "WAITLIST_CLOSED" ? 409 : code === "TOO_MANY_REQUESTS" ? 429 : code === "SERVICE_NOT_CONFIGURED" ? 503 : 400;
    return json(response, status, { error: code });
  }
};
