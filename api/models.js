"use strict";
const { env, verify, getToken, rateLimit, clientIp, send } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const session = verify(getToken(req));
  if (!session || session.role !== "admin") return send(res, 401, { error: "Admin login required." });

  if (!rateLimit("models:" + clientIp(req), 10, 60 * 1000)) {
    return send(res, 429, { error: "Too many requests. Try again in a minute." });
  }

  const apiKey = env("GEMINI_API_KEY");
  if (!apiKey) return send(res, 500, { error: "GEMINI_API_KEY is not set on the server." });

  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": apiKey }
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) ? String(data.error.message).slice(0, 200) : "Google rejected the key.";
      return send(res, 502, { error: msg });
    }
    const models = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent") && /gemini/i.test(m.name))
      .map((m) => String(m.name).replace(/^models\//, ""))
      .filter((n) => !/embed|aqa|tts|image|live|vision/i.test(n));
    return send(res, 200, { models });
  } catch (e) {
    return send(res, 504, { error: "Could not reach Google." });
  }
};
