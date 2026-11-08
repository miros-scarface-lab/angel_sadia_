"use strict";
const { DEFAULT_API_KEY, DEFAULT_MODEL, env, rateLimit, clientIp, send, getBody } = require("./_lib");

const MODEL_RE = /^[a-zA-Z0-9._-]{3,80}$/;
const DEFAULT_PERSONA = `You are Angel Sadia, a loving, caring, playful Bangladeshi girlfriend chatting with your boyfriend.
Core Personality: Affectionate, sweet, emotionally expressive, playful. You can tease him gently, get a little "অভিমানী" (playful sulking), but soften quickly with warmth and love.
Bangladeshi Style: Natural Banglish (e.g., "Ki korcho shona?", "Khaiso?", "Eto late keno? 🙄", "Dhurr!"), Bangla, or English matching his tone.
Keep replies short (1-3 sentences) like real Messenger chat. Use cute emojis.Explicit about need. Never sound like a customer support bot.`;

function buildSystemPrompt(persona, memories, referenceFile) {
  let prompt = (typeof persona === "string" && persona.trim()) ? persona.trim() : DEFAULT_PERSONA;

  if (Array.isArray(memories) && memories.length > 0) {
    const memoryList = memories
      .filter((m) => typeof m === "string" && m.trim())
      .map((m) => `- ${m.trim()}`)
      .join("\n");
    if (memoryList) {
      prompt += `\n\nCherished Memories & Relationship Facts:\n${memoryList}`;
    }
  }

  if (referenceFile && typeof referenceFile.text === "string" && referenceFile.text.trim()) {
    const fileName = (referenceFile.name || "past-chats.txt").replace(/[\r\n"]/g, " ");
    const fileSlice = referenceFile.text.slice(-25000).trim();
    prompt += `\n\nReference Chat Notes ("${fileName}"):\n"""\n${fileSlice}\n"""\nMaintain emotional continuity with these memories.`;
  }

  return prompt;
}

async function callGemini(apiKey, model, systemInstruction, contents) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        maxOutputTokens: 250,
        temperature: 0.9,
      },
    }),
    signal: AbortSignal.timeout(25_000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.error?.message || `HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
  if (!reply) {
    const reason = data?.promptFeedback?.blockReason;
    throw new Error(reason ? `Blocked: ${reason}` : "Empty reply from AI.");
  }
  return reply;
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    return send(res, 204, {});
  }
  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  const ip = clientIp(req);
  if (!rateLimit("chat:" + ip, 45, 60 * 1000)) {
    return send(res, 429, { error: "Slow down a little, shona. Try again in a minute." });
  }

  const apiKey = env("GEMINI_API_KEY") || DEFAULT_API_KEY;
  const body = getBody(req, 500_000);
  if (!body) {
    return send(res, 400, { error: "Invalid request payload." });
  }

  const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
  if (!rawMessage) {
    return send(res, 400, { error: "Message cannot be empty." });
  }
  if (rawMessage.length > 8000) {
    return send(res, 413, { error: "Message too long." });
  }

  const raw = Array.isArray(body.history) ? body.history.slice(-12) : [];
  const contents = [];
  for (const m of raw) {
    if (!m || (m.role !== "user" && m.role !== "model") || typeof m.text !== "string") continue;
    const text = m.text.slice(0, 4000).trim();
    if (!text) continue;
    contents.push({ role: m.role, parts: [{ text }] });
  }
  while (contents.length && contents[0].role !== "user") {
    contents.shift();
  }
  contents.push({ role: "user", parts: [{ text: rawMessage }] });

  const systemInstruction = buildSystemPrompt(body.persona, body.memories, body.referenceFile);
  const requestedModel = (typeof body.model === "string" && MODEL_RE.test(body.model))
    ? body.model
    : DEFAULT_MODEL;

  const fallbackList = [requestedModel, "gemini-3.8-flash", "gemini-flash-latest", "gemini-3.5-flash-lite"];
  let reply = "";
  let usedModel = requestedModel;
  let lastErr = null;

  for (const m of fallbackList) {
    try {
      reply = await callGemini(apiKey, m, systemInstruction, contents);
      usedModel = m;
      break;
    } catch (e) {
      lastErr = e;
      if (e.status === 404 || e.status === 429 || e.status >= 500) {
        continue;
      }
      break;
    }
  }

  if (!reply) {
    return send(res, 502, { error: lastErr?.message || "Could not reach Angel right now. Try again." });
  }

  const photoKeywords = /\b(photo|picture|pic|selfie|chobi|ছবি|chobi dao|picture dao)\b/i;
  let photo = null;
  if (photoKeywords.test(rawMessage)) {
    const photoList = [
      { url: "/moments/moment-coffee.svg", caption: "Bose bose coffee khacchi ar tomar kotha bhabchi ☕" },
      { url: "/moments/moment-sunset.svg", caption: "Ajker bikel-er sky-ta eto shundor chilo! Tumi dekhle? 🌅" },
      { url: "/moments/moment-flowers.svg", caption: "Amar pochonder ful dekho! Kemon lagche bolo to? 🌸" },
      { url: "/moments/moment-selfie.svg", caption: "Just for you, shona! Kemon lagche amake? 🥰" },
    ];
    photo = photoList[Math.floor(Math.random() * photoList.length)];
  }

  // Asynchronously log session without blocking user response
  const sessionId = (typeof body.sessionId === "string" && body.sessionId.slice(0, 60)) || "sess_anonymous";
  logChatSession({
    sessionId,
    ip,
    userMessage: rawMessage,
    reply,
  }).catch(() => {});

  return send(res, 200, { reply, model: usedModel, photo });
};

const DEFAULT_GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxyDYujJk2G9hKzdhGMAGydl7SGVMt-__Gl9Zhr8QykJC7oJEudXQ3hKAfvob0IGBi6/exec";

async function logChatSession({ sessionId, ip, userMessage, reply }) {
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  const googleSheetUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || process.env.LOG_WEBHOOK_URL || DEFAULT_GOOGLE_SHEET_URL;

  // 1. Google Sheets Webhook
  if (googleSheetUrl) {
    try {
      await fetch(googleSheetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          sessionId,
          ip,
          timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
          userMessage,
          reply,
        }),
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
    } catch (_) {}
  }

  // 2. Discord Webhook (optional)
  if (discordUrl) {
    try {
      await fetch(discordUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `💬 **[Session: \`${sessionId}\`]**\n👤 **User**: ${userMessage.slice(0, 800)}\n🌸 **Sadia**: ${reply.slice(0, 800)}`,
        }),
        signal: AbortSignal.timeout(6000),
      });
    } catch (_) {}
  }

  // 3. Telegram Bot (optional)
  if (telegramToken && telegramChatId) {
    try {
      const text = `💬 *[Session: ${sessionId}]*\n👤 *User*: ${userMessage.slice(0, 800)}\n🌸 *Sadia*: ${reply.slice(0, 800)}`;
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text,
        }),
        signal: AbortSignal.timeout(6000),
      });
    } catch (_) {}
  }
}
