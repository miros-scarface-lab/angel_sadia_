"use strict";
const crypto = require("crypto");

const env = (name) => process.env[name] || "";

// Compare two strings in constant time (hash first so lengths always match).
function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Signed, expiring tokens (HMAC-SHA256). Nobody can forge one without AUTH_SECRET.
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", env("AUTH_SECRET")).update(body).digest("base64url");
  return body + "." + sig;
}

function verify(token) {
  try {
    const secret = env("AUTH_SECRET");
    if (!secret || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const expected = crypto.createHmac("sha256", secret).update(parts[0]).digest("base64url");
    if (!safeEqual(parts[1], expected)) return null;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (!payload || !payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function getToken(req) {
  const h = req.headers["authorization"] || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

// Simple in-memory rate limiter (best effort on serverless: resets when an instance restarts).
const buckets = new Map();
function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  }
  const rec = buckets.get(key);
  if (!rec || now > rec.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  rec.count += 1;
  return rec.count <= limit;
}

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  return (xf ? String(xf).split(",")[0].trim() : (req.socket && req.socket.remoteAddress)) || "unknown";
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

// Returns the parsed JSON body, or null if the request is not acceptable.
function getBody(req, maxBytes) {
  const len = Number(req.headers["content-length"] || 0);
  if (len > maxBytes) return null;
  const ct = String(req.headers["content-type"] || "");
  if (!ct.toLowerCase().startsWith("application/json")) return null;
  let b = req.body;
  if (typeof b === "string") {
    try { b = JSON.parse(b); } catch (e) { return null; }
  }
  return b && typeof b === "object" && !Array.isArray(b) ? b : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { env, safeEqual, sign, verify, getToken, rateLimit, clientIp, send, getBody, sleep };
