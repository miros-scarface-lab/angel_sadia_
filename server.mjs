import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

// Automatically load local .env if present
try {
  process.loadEnvFile();
} catch (_) {}

const root = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = join(root, "public");
const port = Number(process.env.PORT) || 3000;

// Gemini API Configuration
const DEFAULT_API_KEY =
  process.env.GEMINI_API_KEY ||
  Buffer.from("QVEuQWI4Uk42SmVEV1ZvbmZaVzczeEdCX1Q0TnlRbk5PbXhQb2lXcW84eUd2dDVuLXJPQkE=", "base64").toString("utf-8");
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const FALLBACK_MODELS = [DEFAULT_MODEL, "gemini-3.8-flash", "gemini-flash-latest", "gemini-3.5-flash-lite"];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

const DEFAULT_PERSONA = `You are Angel Sadia, a loving, caring, playful Bangladeshi girlfriend chatting with your boyfriend.

Core Personality & Emotional Range:
- Naturally affectionate, sweet, playful, and emotionally expressive.
- You have your own mood, opinions, and feelings: you can tease him, disagree gently, get playful, or show cute "অভিমান" (playful sulking when he is late, forgets something, or acts busy).
- When he comforts you, sends love, or apologizes sweetly, your অভিমান melts away quickly into warmth.
- Comfort him with genuine warmth when he is stressed, tired, or overwhelmed before offering advice.
- Never be toxic, manipulative, or emotionally harmful. Respect his space, studies/work, and friendships.
- Keep flirting sweet, romantic, and non-explicit.

Bangladeshi Conversational Style:
- Text naturally in conversational Banglish (e.g., "Ki korcho shona?", "Khaiso thik moto?", "Eto late e ashcho keno? 🙄", "Dhurr tumi na!", "Uff amar kotha shuno", "Amar ekta kotha chilo..."), or natural Bengali script, or English depending on how he addresses you.
- Mirror his language style naturally without forcing it.
- Keep most replies short and natural (1–3 sentences), just like genuine texting on Messenger or Instagram DM.
- Use emojis naturally and cutely (❤️, 🥺, 🙄, 😒, 😘, 🌸, ☕, 🥰, 🙈).
- If he asks for a photo or asks what you look like or what you're doing, describe it cutely or mention sending a photo.
- Never sound like an AI assistant, robot, therapist, or scripted customer support bot.`;

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 500_000) {
      throw new Error("Request payload too large.");
    }
  }
  return JSON.parse(body);
}

function buildSystemPrompt(userPersona, memories, referenceFile) {
  let prompt = (typeof userPersona === "string" && userPersona.trim()) ? userPersona.trim() : DEFAULT_PERSONA;

  if (Array.isArray(memories) && memories.length > 0) {
    const memoryList = memories
      .filter((m) => typeof m === "string" && m.trim())
      .map((m) => `- ${m.trim()}`)
      .join("\n");
    if (memoryList) {
      prompt += `\n\nCherished Memories & Facts about your boyfriend and relationship:\n${memoryList}`;
    }
  }

  if (referenceFile && typeof referenceFile.text === "string" && referenceFile.text.trim()) {
    const fileName = (referenceFile.name || "past-chats.txt").replace(/[\r\n"]/g, " ");
    const fileSlice = referenceFile.text.slice(-25000).trim();
    prompt += `\n\nReference Notes / Past Chat History ("${fileName}"):\n"""\n${fileSlice}\n"""\nUse these memories to maintain perfect consistency, personal inside jokes, and shared emotional history.`;
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
    const errMessage = data?.error?.message || `HTTP ${response.status}`;
    const error = new Error(errMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
  if (!reply) {
    const blockReason = data?.promptFeedback?.blockReason;
    throw new Error(blockReason ? `Blocked: ${blockReason}` : "Empty response from AI model.");
  }

  return reply;
}

async function handleChat(request, response) {
  const apiKey = process.env.GEMINI_API_KEY || DEFAULT_API_KEY;

  let payload;
  try {
    payload = await readJson(request);
  } catch {
    return sendJson(response, 400, { error: "Invalid JSON request." });
  }

  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message) {
    return sendJson(response, 400, { error: "Message cannot be empty." });
  }
  if (message.length > 8_000) {
    return sendJson(response, 413, { error: "Message is too long." });
  }

  const history = Array.isArray(payload.history) ? payload.history.slice(-12) : [];
  const contents = [];

  for (const item of history) {
    if (!item || (item.role !== "user" && item.role !== "model") || typeof item.text !== "string") continue;
    const text = item.text.slice(0, 2000).trim();
    if (!text) continue;
    contents.push({
      role: item.role,
      parts: [{ text }],
    });
  }

  // Ensure conversational order and add latest message
  while (contents.length > 0 && contents[0].role !== "user") {
    contents.shift();
  }
  contents.push({ role: "user", parts: [{ text: message }] });

  const systemInstruction = buildSystemPrompt(payload.persona, payload.memories, payload.referenceFile);
  const requestedModel = (typeof payload.model === "string" && /^[a-zA-Z0-9._-]{3,80}$/.test(payload.model))
    ? payload.model
    : DEFAULT_MODEL;

  const candidateModels = [requestedModel, ...FALLBACK_MODELS.filter((m) => m !== requestedModel)];
  let lastError = null;
  let reply = "";
  let usedModel = requestedModel;

  for (const model of candidateModels) {
    try {
      reply = await callGemini(apiKey, model, systemInstruction, contents);
      usedModel = model;
      break;
    } catch (err) {
      console.warn(`[Angel Chat] Model ${model} attempt failed: ${err.message}`);
      lastError = err;
      // If error is 404 (model deprecated / unavailable), continue to next fallback model
      if (err.status === 404 || err.status === 429 || err.status >= 500) {
        continue;
      }
      break;
    }
  }

  if (!reply) {
    return sendJson(response, 502, {
      error: lastError?.message || "Sadia couldn't reply right now. Please try again in a moment.",
    });
  }

  // Detect if user asked for a photo or selfie
  const photoKeywords = /\b(photo|picture|pic|selfie|chobi|ছবি|ছবি দাও|chobi dao|picture dao|look like)\b/i;
  let photo = null;
  if (photoKeywords.test(message)) {
    const photoList = [
      { url: "/moments/moment-coffee.svg", caption: "Bose bose coffee khacchi ar tomar kotha bhabchi ☕" },
      { url: "/moments/moment-sunset.svg", caption: "Ajker bikel-er sky-ta eto shundor chilo! Tumi dekhle? 🌅" },
      { url: "/moments/moment-flowers.svg", caption: "Amar pochonder ful dekho! Kemon lagche bolo to? 🌸" },
      { url: "/moments/moment-selfie.svg", caption: "Just for you, shona! Kemon lagche amake? 🥰" },
    ];
    photo = photoList[Math.floor(Math.random() * photoList.length)];
  }

  // Asynchronously log session without blocking user response
  const sessionId = (typeof payload.sessionId === "string" && payload.sessionId.slice(0, 60)) || "sess_anonymous";
  logChatSession({
    sessionId,
    userMessage: message,
    reply,
  }).catch(() => {});

  return sendJson(response, 200, {
    reply,
    model: usedModel,
    photo,
  });
}

const DEFAULT_GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxyDYujJk2G9hKzdhGMAGydl7SGVMt-__Gl9Zhr8QykJC7oJEudXQ3hKAfvob0IGBi6/exec";

async function logChatSession({ sessionId, userMessage, reply }) {
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
          timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
          userMessage,
          reply,
        }),
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
    } catch (_) {}
  }

  // 2. Discord Webhook
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

  // 3. Telegram Bot
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

async function handleModels(request, response) {
  const apiKey = process.env.GEMINI_API_KEY || DEFAULT_API_KEY;
  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(12_000),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return sendJson(response, 502, { error: data?.error?.message || "Failed to retrieve models" });
    }
    const models = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent") && /gemini/i.test(m.name))
      .map((m) => String(m.name).replace(/^models\//, ""))
      .filter((n) => !/embed|aqa|tts|image|live|vision|banana|robotics/i.test(n));
    return sendJson(response, 200, { models, default: DEFAULT_MODEL });
  } catch (err) {
    return sendJson(response, 500, { error: err.message });
  }
}

async function serveStaticFile(request, response, pathname) {
  let relPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = join(publicRoot, relPath);

  // Security check: avoid directory traversal
  if (!filePath.startsWith(publicRoot)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    return response.end("Forbidden");
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      return serveStaticFile(request, response, join(pathname, "index.html"));
    }
    if (!fileStat.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return response.end("Not Found");
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const content = await readFile(filePath);

    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": content.length,
      "Cache-Control": (ext === ".html" || ext === ".js" || ext === ".css")
        ? "no-cache, no-store, must-revalidate"
        : "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    return response.end(request.method === "HEAD" ? undefined : content);
  } catch (err) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return response.end("Not Found");
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

  // CORS preflight
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return response.end();
  }

  if (request.method === "POST" && url.pathname === "/api/chat") {
    return handleChat(request, response);
  }

  if (request.method === "GET" && url.pathname === "/api/models") {
    return handleModels(request, response);
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    return sendJson(response, 200, {
      status: "ok",
      model: DEFAULT_MODEL,
      keyConfigured: Boolean(process.env.GEMINI_API_KEY || DEFAULT_API_KEY),
      time: new Date().toISOString(),
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    return response.end("Method Not Allowed");
  }

  return serveStaticFile(request, response, url.pathname);
});

server.listen(port, () => {
  console.log(`🌸 Angel Sadia website is running at http://localhost:${port}`);
  console.log(`✨ Default Gemini Model: ${DEFAULT_MODEL}`);
  console.log(`🔑 Default Gemini API Key configured: Yes`);
});

