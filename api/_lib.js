"use strict";

const DEFAULT_API_KEY = process.env.GEMINI_API_KEY || "";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

const env = (name) =>
  process.env[name] ||
  (name === "GEMINI_API_KEY"
    ? DEFAULT_API_KEY
    : name === "GEMINI_MODEL"
    ? DEFAULT_MODEL
    : "");

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
  return (
    (xf ? String(xf).split(",")[0].trim() : req.socket && req.socket.remoteAddress) ||
    "unknown"
  );
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.end(JSON.stringify(obj));
}

function getBody(req, maxBytes) {
  const len = Number(req.headers["content-length"] || 0);
  if (len > maxBytes) return null;
  let b = req.body;
  if (typeof b === "string") {
    try {
      b = JSON.parse(b);
    } catch (e) {
      return null;
    }
  }
  return b && typeof b === "object" ? b : null;
}

module.exports = {
  DEFAULT_API_KEY,
  DEFAULT_MODEL,
  env,
  rateLimit,
  clientIp,
  send,
  getBody,
};
