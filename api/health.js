"use strict";
const { DEFAULT_MODEL, DEFAULT_API_KEY, env, send } = require("./_lib");

module.exports = async (req, res) => {
  return send(res, 200, {
    status: "ok",
    model: env("GEMINI_MODEL") || DEFAULT_MODEL,
    keyConfigured: Boolean(env("GEMINI_API_KEY") || DEFAULT_API_KEY),
    time: new Date().toISOString(),
  });
};

