"use strict";

const { getConfig, json, publicError, readJson, requestContext, rpc, sameOrigin } = require("../_lib/sorteo");
const { sendReminderConfirmation } = require("../_lib/email");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  if (!sameOrigin(request)) return json(response, 403, { error: "ORIGIN_NOT_ALLOWED" });
  const config = getConfig();
  try {
    const body = await readJson(request, 3_000);
    if (body.website) return json(response, 202, { ok: true });
    const context = requestContext(request);
    const email = String(body.email || "").trim().toLowerCase();
    const result = await rpc("join_giveaway_waitlist", {
      p_campaign_id: config.campaignId,
      p_email: email,
      p_consent: body.consent === true,
      p_request_context: context,
      p_source: config.isPreview ? "vercel-preview-hub" : "production-hub",
    });

    let emailSent = result.confirmationSent === true;
    if (result.shouldSend === true && result.waitlistId) {
      try {
        await sendReminderConfirmation(email);
        await rpc("complete_waitlist_confirmation", {
          p_campaign_id: config.campaignId,
          p_waitlist_id: result.waitlistId,
          p_request_context: context,
        });
        emailSent = true;
      } catch (emailError) {
        console.error("WAITLIST_CONFIRMATION_FAILED", {
          campaign: config.campaignId,
          reason: String(emailError?.message || "UNKNOWN_EMAIL_ERROR"),
          providerStatus: Number(emailError?.providerStatus || 0) || undefined,
          providerReason: String(emailError?.providerReason || "provider-detail-unavailable"),
        });
      }
    }

    return json(response, 201, {
      ok: true,
      emailSent,
      alreadyRegistered: result.created === false,
    });
  } catch (error) {
    const code = publicError(error);
    const status = code === "WAITLIST_CLOSED" ? 409 : code === "TOO_MANY_REQUESTS" ? 429 : code === "SERVICE_NOT_CONFIGURED" ? 503 : 400;
    return json(response, status, { error: code });
  }
};
