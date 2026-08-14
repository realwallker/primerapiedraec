"use strict";

const DEFAULT_PRODUCTION_CAMPAIGN = "ep03-boris-2026";
const DEFAULT_PREVIEW_CAMPAIGN = "ep03-boris-2026-preview";
const DEFAULT_SUPABASE_URL = "https://bloijkrgsxglnqabpaqd.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NEFLDM8Rx9fYDhfn5gij1A_1OxOf1iy";
const DEFAULT_ADMIN_EMAILS = "wallkeron60hz@gmail.com";

function json(response, status, payload, cacheControl = "no-store") {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", cacheControl);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(payload));
}

function getConfig() {
  const isPreview = process.env.VERCEL_ENV === "preview";
  return {
    supabaseUrl: String(process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, ""),
    supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    campaignId: process.env.GIVEAWAY_CAMPAIGN_ID || (isPreview ? DEFAULT_PREVIEW_CAMPAIGN : DEFAULT_PRODUCTION_CAMPAIGN),
    adminEmails: process.env.GIVEAWAY_ADMIN_EMAILS || DEFAULT_ADMIN_EMAILS,
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY || "",
    isPreview,
  };
}

function isConfigured(config = getConfig()) {
  return Boolean(config.supabaseUrl && config.supabaseKey);
}

async function readJson(request, maxBytes = 18_000) {
  const declared = Number(request.headers["content-length"] || 0);
  if (declared > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
  if (request.body && typeof request.body === "object") return request.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (_) {
    throw new Error("INVALID_JSON");
  }
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.host;
  } catch (_) {
    return false;
  }
}

async function rpc(functionName, params, accessToken) {
  const config = getConfig();
  if (!isConfigured(config)) throw new Error("SERVICE_NOT_CONFIGURED");
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${accessToken || config.supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params || {}),
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch (_) { payload = { message: text }; }
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.code || "DATABASE_REQUEST_FAILED");
    error.status = response.status;
    error.details = payload;
    throw error;
  }
  return payload;
}

async function verifyTurnstile(token, remoteIp) {
  const config = getConfig();
  if (!config.turnstileSecret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret: config.turnstileSecret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true;
}

function requestContext(request) {
  const ip = String(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const userAgent = String(request.headers["user-agent"] || "unknown").slice(0, 300);
  return `${ip}|${userAgent}`;
}

function bearerToken(request) {
  const header = String(request.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function publicError(error) {
  const known = new Set([
    "CAMPAIGN_NOT_FOUND", "CAMPAIGN_NOT_OPEN", "INVALID_NAME", "INVALID_CITY",
    "INVALID_NETWORK", "INVALID_HANDLE", "INVALID_CONTACT", "CONSENT_REQUIRED",
    "SOCIAL_ROUTE_REQUIRED", "DUPLICATE_ENTRY", "PAYLOAD_TOO_LARGE", "INVALID_JSON",
    "ADMIN_REQUIRED", "ENTRY_NOT_FOUND", "INVALID_STATUS", "SNAPSHOT_ALREADY_FROZEN",
    "NOT_ENOUGH_VALID_ENTRIES", "SNAPSHOT_REQUIRED", "DRAW_REQUIRED", "SERVICE_NOT_CONFIGURED",
    "INVALID_EMAIL", "WAITLIST_CONSENT_REQUIRED", "WAITLIST_CLOSED", "TOO_MANY_REQUESTS",
    "ANTI_ABUSE_NOT_CONFIGURED",
  ]);
  const message = String(error?.message || "UNEXPECTED_ERROR");
  return known.has(message) ? message : "UNEXPECTED_ERROR";
}

module.exports = {
  bearerToken,
  getConfig,
  isConfigured,
  json,
  publicError,
  readJson,
  requestContext,
  rpc,
  sameOrigin,
  verifyTurnstile,
};
