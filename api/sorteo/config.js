"use strict";

const { getConfig, isConfigured, json } = require("../_lib/sorteo");

module.exports = function handler(_request, response) {
  const config = getConfig();
  json(response, 200, {
    configured: isConfigured(config),
    campaignId: config.campaignId,
    supabaseUrl: config.supabaseUrl,
    supabasePublishableKey: config.supabaseKey,
    turnstileSiteKey: config.turnstileSiteKey,
    environment: config.isPreview ? "preview" : "production",
  }, "public, s-maxage=60, stale-while-revalidate=300");
};

