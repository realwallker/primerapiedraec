"use strict";

const { bearerToken, getConfig, json, publicError, rpc } = require("../../_lib/sorteo");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  const token = bearerToken(request);
  if (!token) return json(response, 401, { error: "AUTH_REQUIRED" });
  try {
    const data = await rpc("admin_giveaway_entries", { p_campaign_id: getConfig().campaignId }, token);
    return json(response, 200, data);
  } catch (error) {
    const code = publicError(error);
    return json(response, code === "ADMIN_REQUIRED" ? 403 : 400, { error: code });
  }
};

