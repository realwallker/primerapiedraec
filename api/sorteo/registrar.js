"use strict";

const {
  getConfig, isConfigured, json, publicError, readJson, requestFingerprint, rpc, sameOrigin, verifyTurnstile,
} = require("../_lib/sorteo");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  if (!sameOrigin(request)) return json(response, 403, { error: "ORIGIN_NOT_ALLOWED" });
  const config = getConfig();
  if (!isConfigured(config)) return json(response, 503, { error: "SERVICE_NOT_CONFIGURED" });
  if (!config.hashSecret && !config.isPreview) return json(response, 503, { error: "ANTI_ABUSE_NOT_CONFIGURED" });

  try {
    const body = await readJson(request);
    if (body.website) return json(response, 400, { error: "INVALID_SUBMISSION" });
    if (Number(body.elapsedMs || 0) < 1800) return json(response, 429, { error: "SUBMISSION_TOO_FAST" });
    const ip = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (!(await verifyTurnstile(body.turnstileToken, ip))) return json(response, 400, { error: "ANTI_BOT_FAILED" });

    const result = await rpc("register_giveaway_entry", {
      p_campaign_id: config.campaignId,
      p_full_name: body.fullName,
      p_city: body.city,
      p_social_network: body.socialNetwork,
      p_social_handle: body.socialHandle,
      p_contact_type: body.contactType,
      p_contact_value: body.contactValue,
      p_age_confirmed: body.ageConfirmed === true,
      p_ecuador_resident: body.ecuadorResident === true,
      p_pickup_confirmed: body.pickupConfirmed === true,
      p_social_declaration: body.socialDeclaration === true,
      p_terms_confirmed: body.termsConfirmed === true,
      p_privacy_confirmed: body.privacyConfirmed === true,
      p_public_announcement_confirmed: body.publicAnnouncementConfirmed === true,
      p_social_visits: body.socialVisits || {},
      p_request_hash: requestFingerprint(request),
      p_source: config.isPreview ? "vercel-preview" : "production-web",
    });
    return json(response, 201, result);
  } catch (error) {
    const code = publicError(error);
    const status = code === "DUPLICATE_ENTRY" ? 409 : code === "SERVICE_NOT_CONFIGURED" ? 503 : 400;
    return json(response, status, { error: code });
  }
};
