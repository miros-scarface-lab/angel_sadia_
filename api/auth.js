"use strict";
const { env, safeEqual, sign, rateLimit, clientIp, send, getBody, sleep } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  if (!env("AUTH_SECRET") || !env("ADMIN_PASSWORD")) {
    return send(res, 500, { error: "Server is not set up yet. Check the Vercel environment variables." });
  }

  const body = getBody(req, 2000);
  if (!body) return send(res, 400, { error: "Bad request" });

  const role = body.role === "admin" ? "admin" : "site";
  const sitePw = env("SITE_PASSWORD");
  const DAY = 24 * 60 * 60 * 1000;

  // Chat without a password: SITE_PASSWORD is empty, so anyone with the link can chat.
  if (role === "site" && !sitePw) {
    return send(res, 200, { token: sign({ role: "site", exp: Date.now() + 30 * DAY }), expiresIn: 30 * DAY, open: true });
  }

  // A page-load check with an empty password is not a guess, so it does not use up attempts.
  if (typeof body.password !== "string" || body.password.length === 0) {
    return send(res, 401, { error: "Password required" });
  }

  // Brute-force protection: 8 attempts per 15 minutes per IP.
  if (!rateLimit("login:" + clientIp(req), 8, 15 * 60 * 1000)) {
    return send(res, 429, { error: "Too many attempts. Try again in 15 minutes." });
  }

  const expected = role === "admin" ? env("ADMIN_PASSWORD") : sitePw;
  const ok = body.password.length <= 200 && safeEqual(body.password, expected);

  if (!ok) {
    await sleep(800); // slows down guessing
    return send(res, 401, { error: "Wrong password" });
  }

  const ttl = role === "admin" ? 30 * 60 * 1000 : 30 * DAY;
  return send(res, 200, { token: sign({ role, exp: Date.now() + ttl }), expiresIn: ttl });
};
