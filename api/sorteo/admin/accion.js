"use strict";

const { bearerToken, getConfig, json, publicError, readJson, rpc, sameOrigin } = require("../../_lib/sorteo");

const ACTIONS = {
  status: { fn: "admin_set_entry_status", params: (body) => ({ p_entry_id: body.entryId, p_status: body.status }) },
  freeze: { fn: "admin_freeze_giveaway", params: (_body, campaignId) => ({ p_campaign_id: campaignId }) },
  draw: { fn: "admin_draw_giveaway", params: (_body, campaignId) => ({ p_campaign_id: campaignId }) },
  publish: { fn: "admin_publish_giveaway", params: (_body, campaignId) => ({ p_campaign_id: campaignId }) },
};

module.exports = async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  if (!sameOrigin(request)) return json(response, 403, { error: "ORIGIN_NOT_ALLOWED" });
  const token = bearerToken(request);
  if (!token) return json(response, 401, { error: "AUTH_REQUIRED" });
  try {
    const body = await readJson(request, 8_000);
    const action = ACTIONS[body.action];
    if (!action) return json(response, 400, { error: "INVALID_ACTION" });
    const data = await rpc(action.fn, action.params(body, getConfig().campaignId), token);
    return json(response, 200, data);
  } catch (error) {
    const code = publicError(error);
    return json(response, code === "ADMIN_REQUIRED" ? 403 : 400, { error: code });
  }
};

