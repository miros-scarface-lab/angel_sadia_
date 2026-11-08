import { DEFAULT_MODEL, DEFAULT_API_KEY, env, send } from "./_lib.js";

export default async function handler(req, res) {
  return send(res, 200, {
    status: "ok",
    model: env("GEMINI_MODEL") || DEFAULT_MODEL,
    keyConfigured: Boolean(env("GEMINI_API_KEY") || DEFAULT_API_KEY),
    time: new Date().toISOString(),
  });
}
