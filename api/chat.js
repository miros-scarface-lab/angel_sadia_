"use strict";
const { env, verify, getToken, rateLimit, clientIp, send, getBody } = require("./_lib");

const MODEL_RE = /^[a-zA-Z0-9._-]{3,80}$/;
const FALLBACK_PROMPT = "You are Angel Sadia, a caring, playful girlfriend. Keep replies short and natural. Keep intimacy non-explicit.";

const clean = (v, max) => (typeof v === "string" ? v.slice(0, max).trim() : "");

function buildSystem(p) {
  p = p && typeof p === "object" ? p : {};
  const name = clean(p.name, 40) || "Angel Sadia";
  let s = clean(p.prompt, 20000) || FALLBACK_PROMPT;
  s += "\n\nYour name is " + name + ".";
  const file = typeof p.fileText === "string" ? p.fileText.slice(-30000).trim() : "";
  if (file) {
    const fname = clean(p.fileName, 80).replace(/[\r\n"]/g, " ");
    s += '\n\nReference file "' + fname + '" (past chats, memories or notes). Learn the tone, vocabulary and facts from it and stay consistent with it, but do not quote it word for word:\n"""\n' + file + '\n"""';
  }
  return s;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  // 1. Must be logged in
  const session = verify(getToken(req));
  if (!session) return send(res, 401, { error: "Please log in again." });

  // 2. Rate limit: 30 messages per minute per IP
  if (!rateLimit("chat:" + clientIp(req), 30, 60 * 1000)) {
    return send(res, 429, { error: "Slow down a little. Try again in a minute." });
  }

  // Daily cap per IP so strangers cannot drain your quota when the chat has no password.
  if (!rateLimit("chatday:" + clientIp(req), 400, 24 * 60 * 60 * 1000)) {
    return send(res, 429, { error: "Daily message limit reached. Try again tomorrow." });
  }

  const apiKey = env("GEMINI_API_KEY");
  if (!apiKey) return send(res, 500, { error: "GEMINI_API_KEY is not set on the server." });

  // 3. Validate input
  const body = getBody(req, 600000);
  if (!body) return send(res, 400, { error: "Bad request" });

  const raw = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  const contents = [];
  for (const m of raw) {
    if (!m || (m.role !== "user" && m.role !== "model") || typeof m.text !== "string") continue;
    const text = m.text.slice(0, 4000);
    if (!text.trim()) continue;
    contents.push({ role: m.role, parts: [{ text }] });
  }
  while (contents.length && contents[0].role !== "user") contents.shift();
  if (!contents.length || contents[contents.length - 1].role !== "user") {
    return send(res, 400, { error: "Bad request" });
  }

  const model = typeof body.model === "string" && MODEL_RE.test(body.model)
    ? body.model
    : (env("GEMINI_MODEL") || "gemini-3.5-flash");

  // 4. Call Gemini (the key never leaves the server)
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: buildSystem(body.persona) }] },
          contents,
          generationConfig: { temperature: 1, maxOutputTokens: 600 }
        }),
        signal: ctrl.signal
      }
    );
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("Gemini error", r.status, data && data.error && data.error.message);
      const msg = (data && data.error && data.error.message) ? String(data.error.message).slice(0, 200) : "AI service error";
      return send(res, 502, { error: msg });
    }
    const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    const reply = parts ? parts.map((p) => p.text || "").join("").trim() : "";
    if (!reply) {
      const why = data.promptFeedback && data.promptFeedback.blockReason ? "Blocked: " + data.promptFeedback.blockReason : "Empty reply. Try again.";
      return send(res, 502, { error: why });
    }
    return send(res, 200, { reply });
  } catch (e) {
    console.error("Chat failure", e && e.name);
    return send(res, 504, { error: e && e.name === "AbortError" ? "The AI took too long. Try again." : "Could not reach the AI service." });
  } finally {
    clearTimeout(timer);
  }
};
