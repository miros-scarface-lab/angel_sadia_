"use strict";
const { DEFAULT_API_KEY, DEFAULT_MODEL, env, send } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method !== "GET" && req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const apiKey = env("GEMINI_API_KEY") || DEFAULT_API_KEY;

  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(12000),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return send(res, 502, { error: data?.error?.message || "Could not list models" });
    }
    const models = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent") && /gemini/i.test(m.name))
      .map((m) => String(m.name).replace(/^models\//, ""))
      .filter((n) => !/embed|aqa|tts|image|live|vision|banana|robotics/i.test(n));

    return send(res, 200, { models, default: DEFAULT_MODEL });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
};

