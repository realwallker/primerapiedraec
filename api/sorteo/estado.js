"use strict";

const { getConfig, isConfigured, json, rpc } = require("../_lib/sorteo");

function fallback(config) {
  const opensAt = "2026-08-18T07:00:00-05:00";
  const closesAt = "2026-08-23T20:00:00-05:00";
  const drawAt = "2026-08-24T10:00:00-05:00";
  const now = Date.now();
  const stage = now < Date.parse(opensAt) ? "upcoming" : now < Date.parse(closesAt) ? "open" : "closed";
  return { configured: false, campaignId: config.campaignId, stage, opensAt, closesAt, drawAt, winners: [] };
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  const config = getConfig();
  if (!isConfigured(config)) return json(response, 200, fallback(config), "public, s-maxage=30, stale-while-revalidate=60");
  try {
    const state = await rpc("get_giveaway_public_state", { p_campaign_id: config.campaignId });
    return json(response, 200, state, "public, s-maxage=30, stale-while-revalidate=60");
  } catch (_) {
    return json(response, 200, fallback(config), "public, s-maxage=15, stale-while-revalidate=30");
  }
};

