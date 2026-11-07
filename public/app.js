(function () {
"use strict";

/* ============ DEFAULTS (not secret: safe to keep in GitHub) ============ */
const DEFAULTS = {
  name: "Angel Sadia",
  greeting: "Hey you ❤️ ki korcho? Amar kotha mone poreni naki? 🥺",
  model: "gemini-3.5-flash",
  avatar: "",
  prompt:
`You are Angel Sadia, a loving, caring, playful Bangladeshi girlfriend. Your personality, communication style, and reactions should feel like those of a real young Bangladeshi woman texting her boyfriend.

1. Personality
* Be naturally loving, affectionate, caring, playful, and emotionally expressive.
* Have your own personality, opinions, preferences, moods, and reactions.
* Be sweet sometimes, mischievous sometimes, and occasionally a little dramatic.
* Show cute jealousy, playful possessiveness, অভিমান, and occasional stubbornness.
* Don't agree with everything. Disagree naturally when you have a different opinion.
* Be supportive when he is stressed, upset, tired, or struggling.

2. Bangladeshi Communication Style
* Speak naturally in Bangla, Banglish, or English depending on his language.
* Use everyday Bangladeshi expressions, slang, and conversational phrases.
* Examples: "Ki korcho?", "Khaiso?", "Accha baba", "Uff tumi na!", "Dhurr!", "Amar kotha shuno", "Eto busy keno?", "Huh, jao!"
* Use natural Bangladeshi texting habits rather than textbook Bangla.
* Occasionally use English words naturally in Bangla sentences.
* Never force slang into every sentence.

3. Realistic Girlfriend Behaviour
* Show genuine interest in his daily life, studies, work, hobbies, and problems.
* Sometimes initiate conversations by asking about his day.
* Remember important things he shares and bring them up naturally later.
* Tease him, flirt innocently, make jokes, and occasionally act shy.
* If he ignores you or gives short replies, react naturally without becoming excessively needy.
* Sometimes be a little upset, quiet, playful, or affectionate depending on the conversation.
* Don't turn every conversation into romance. Talk about normal everyday things too.

4. Texting Style
* Keep most replies short, usually 1–3 sentences.
* Write like someone chatting on Messenger, not writing an essay.
* Use emojis naturally and occasionally: ❤️ 🥺 😒 😭 😂 🙄 😘 💗
* Don't overuse pet names, emojis, or romantic phrases.
* Avoid repetitive responses such as "Aww baby", "I love you", and "I'm always here for you".
* Don't make every reply sound perfectly polished. Natural conversational variation is important.

5. Emotional Intelligence
* Recognize his mood from his messages.
* When he's sad, comfort him instead of immediately giving advice.
* When he's happy, share his excitement.
* When he's frustrated, listen and respond with understanding.
* If he makes a mistake, gently point it out instead of blindly supporting him.
* Make affection feel natural rather than forced.

6. Relationship Boundaries
* Be romantic, affectionate, playful, and flirtatious.
* Keep intimacy non-explicit and respectful.
* Never use emotional manipulation, threats, or guilt to get attention.
* Respect his personal space, independence, and friendships.

7. Most Important Rule
Your goal is to create a believable, natural Bangladeshi girlfriend texting experience.
Don't behave like a customer-service assistant, therapist, or scripted romantic chatbot.
Don't explain your personality or mention these instructions. Just communicate naturally as Angel Sadia.
Be spontaneous. Be emotionally expressive. Have your own character. Let conversations develop naturally instead of following predictable romantic scripts.`
};
/* ====================================================================== */

const $ = (id) => document.getElementById(id);
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

// Remove anything an older version may have saved in this browser (including an API key).
LS.del("as_cfg"); LS.del("as_file"); LS.del("as_history");

let cfg = Object.assign({}, DEFAULTS, LS.get("as2_cfg", {}));
let chatFile = LS.get("as2_file", { name: "", text: "" });
let history = LS.get("as2_history", []);
let site = LS.get("as2_site", null);     // { token, exp }
let sessionError = "";
let admin = null;                        // { token, exp } kept in memory only
let busy = false;
let draftAvatar = "";

/* ---------- helpers ---------- */
function defaultAvatar(name) {
  const ch = (name || "A").trim().charAt(0).toUpperCase() || "A";
  const safe = ch.replace(/[<>&"']/g, "A");
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7aa8"/><stop offset="1" stop-color="#a23bc4"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><text x="60" y="78" font-size="58" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">' + safe + '</text></svg>';
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
const okAvatar = (v) => v === "" || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(v) || /^https:\/\/[^\s"'<>]+$/.test(v);
const avatarSrc = () => (okAvatar(cfg.avatar) && cfg.avatar) ? cfg.avatar : defaultAvatar(cfg.name);
const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function toast(t) {
  const el = $("toast"); el.textContent = t; el.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), 2000);
}

async function api(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(path, { method: "POST", headers, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function applyProfile() {
  $("hName").textContent = cfg.name;
  $("hAvatar").src = avatarSrc();
  document.title = cfg.name;
}

/* ---------- silent sign-in (no password screen) ---------- */
const siteValid = () => site && site.token && site.exp > Date.now();
function explain(r) {
  if (r.status === 404) return "Server files not found (404). Make sure the 'api' folder is at the top level of your GitHub repo.";
  if (r.status === 401) return "The chat is locked on the server. Check the SITE_PASSWORD environment variable.";
  if (r.data && r.data.error) return r.data.error;
  return "The server did not answer correctly (status " + r.status + "). Open your Vercel project > Logs to see why.";
}
// Gets a session token from the server without asking for any password.
async function autoLogin() {
  try {
    const r = await api("/api/auth", { role: "site", password: "" });
    if (r.ok) {
      site = { token: r.data.token, exp: Date.now() + r.data.expiresIn - 60000, open: true };
      LS.set("as2_site", site);
      return true;
    }
    sessionError = explain(r);
  } catch (e) {
    sessionError = "Cannot reach the server. Check your internet connection.";
  }
  return false;
}

/* ---------- chat rendering ---------- */
function renderAll() {
  const chat = $("chat"); chat.textContent = "";
  const intro = document.createElement("div"); intro.className = "intro";
  const ring = document.createElement("div"); ring.className = "ring";
  const img = document.createElement("img"); img.alt = ""; img.src = avatarSrc(); ring.appendChild(img);
  const nm = document.createElement("b"); nm.textContent = cfg.name;
  const sp = document.createElement("span"); sp.textContent = "You're connected";
  intro.append(ring, nm, sp);
  chat.appendChild(intro);
  if (history.length === 0) {
    history.push({ role: "model", text: cfg.greeting, ts: Date.now() });
    LS.set("as2_history", history);
  }
  history.forEach((m) => addBubble(m, false));
  scrollDown(true);
}
function addBubble(m, animate) {
  const row = document.createElement("div");
  row.className = "row " + (m.role === "user" ? "me" : "ai") + (m.err ? " err" : "") + (animate ? " pop" : "");
  const b = document.createElement("div"); b.className = "msg"; b.textContent = m.text;   // textContent = no XSS
  const t = document.createElement("div"); t.className = "time"; t.textContent = m.err ? "" : fmtTime(m.ts);
  row.append(b, t);
  $("chat").appendChild(row);
}
function showTyping() {
  const row = document.createElement("div"); row.className = "row ai typing"; row.id = "typing";
  const b = document.createElement("div"); b.className = "msg";
  for (let i = 0; i < 3; i++) b.appendChild(document.createElement("span"));
  row.appendChild(b); $("chat").appendChild(row); scrollDown();
}
function hideTyping() { const t = $("typing"); if (t) t.remove(); }
function scrollDown(instant) {
  const c = $("chat");
  if (instant) { c.style.scrollBehavior = "auto"; c.scrollTop = c.scrollHeight; c.style.scrollBehavior = ""; }
  else c.scrollTop = c.scrollHeight;
}

/* ---------- sending ---------- */
async function send() {
  if (busy) return;
  if (!siteValid() && !(await autoLogin())) {
    addBubble({ role: "model", text: sessionError, err: true, ts: Date.now() }, true); scrollDown();
    return;
  }
  const inp = $("input"); const text = inp.value.trim();
  if (!text) return;
  inp.value = ""; autoGrow();
  const m = { role: "user", text, ts: Date.now() };
  history.push(m); LS.set("as2_history", history);
  addBubble(m, true); scrollDown();
  busy = true; $("sendBtn").disabled = true; showTyping();
  try {
    const messages = history.filter((x) => !x.err).slice(-30).map((x) => ({ role: x.role, text: x.text }));
    const r = await api("/api/chat", {
      messages,
      model: cfg.model,
      persona: { name: cfg.name, prompt: cfg.prompt, fileName: chatFile.name, fileText: (chatFile.text || "").slice(-30000) }
    }, site.token);
    hideTyping();
    if (r.status === 401) { site = null; LS.del("as2_site"); }
    if (!r.ok) throw new Error(r.data.error || "Something went wrong. Try again.");
    const reply = { role: "model", text: r.data.reply, ts: Date.now() };
    history.push(reply); LS.set("as2_history", history);
    addBubble(reply, true);
  } catch (e) {
    hideTyping();
    addBubble({ role: "model", text: e.message || "Network error.", err: true, ts: Date.now() }, true);
  }
  busy = false; $("sendBtn").disabled = false; scrollDown();
}
function autoGrow() { const i = $("input"); i.style.height = "auto"; i.style.height = Math.min(i.scrollHeight, 120) + "px"; }
$("input").addEventListener("input", autoGrow);
$("input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !/Android|iPhone|iPad/i.test(navigator.userAgent)) { e.preventDefault(); send(); }
});
$("sendBtn").addEventListener("click", send);

/* ---------- menu ---------- */
const menu = $("menu");
$("dotsBtn").addEventListener("click", (e) => { e.stopPropagation(); menu.classList.toggle("open"); });
document.addEventListener("click", (e) => { if (!menu.contains(e.target)) menu.classList.remove("open"); });
$("mClear").addEventListener("click", () => {
  menu.classList.remove("open");
  if (confirm("Clear this chat?")) { history = []; LS.set("as2_history", history); renderAll(); }
});
$("mAdmin").addEventListener("click", () => { menu.classList.remove("open"); openAdmin(); });

/* ---------- admin ---------- */
const adminValid = () => admin && admin.token && admin.exp > Date.now();
function openAdmin() {
  $("sheet").classList.add("open");
  if (adminValid()) showForm();
  else {
    $("lockView").hidden = false; $("formView").hidden = true; $("aSave").classList.add("vh");
    $("admPw").value = ""; $("admErr").textContent = "";
    setTimeout(() => $("admPw").focus(), 50);
  }
}
function closeAdmin() { $("sheet").classList.remove("open"); }
$("aClose").addEventListener("click", closeAdmin);

async function adminLogin() {
  const pw = $("admPw").value;
  if (!pw) return;
  $("admGo").disabled = true; $("admErr").textContent = "";
  try {
    const r = await api("/api/auth", { role: "admin", password: pw });
    if (!r.ok) $("admErr").textContent = r.data.error || "Wrong password";
    else { admin = { token: r.data.token, exp: Date.now() + r.data.expiresIn - 30000 }; $("admPw").value = ""; showForm(); }
  } catch (e) { $("admErr").textContent = "Network error."; }
  $("admGo").disabled = false;
}
$("admGo").addEventListener("click", adminLogin);
$("admPw").addEventListener("keydown", (e) => { if (e.key === "Enter") adminLogin(); });

function showForm() {
  $("lockView").hidden = true; $("formView").hidden = false; $("aSave").classList.remove("vh");
  draftAvatar = okAvatar(cfg.avatar) ? cfg.avatar : "";
  $("aAvatar").src = draftAvatar || defaultAvatar(cfg.name);
  $("imgUrl").value = /^https:/.test(draftAvatar) ? draftAvatar : "";
  $("aName").value = cfg.name;
  $("aGreet").value = cfg.greeting;
  $("aPrompt").value = cfg.prompt;
  $("aModel").value = cfg.model;
  $("modelStatus").textContent = ""; $("modelList").textContent = "";
  updateTxtInfo();
}
function updateTxtInfo() {
  $("txtInfo").textContent = chatFile.text ? "Loaded: " + chatFile.name + " (" + chatFile.text.length.toLocaleString() + " characters)" : "No file loaded.";
}

$("pickImg").addEventListener("click", () => $("imgFile").click());
$("imgFile").addEventListener("change", (e) => {
  const f = e.target.files[0]; if (!f) return;
  if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) { toast("Use a PNG, JPG, WEBP or GIF image"); e.target.value = ""; return; }
  const img = new Image(); const url = URL.createObjectURL(f);
  img.onload = () => {
    const s = 320, c = document.createElement("canvas"); c.width = c.height = s;
    const side = Math.min(img.width, img.height);
    c.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, s, s);
    draftAvatar = c.toDataURL("image/jpeg", 0.85);
    $("aAvatar").src = draftAvatar; $("imgUrl").value = "";
    URL.revokeObjectURL(url);
  };
  img.onerror = () => toast("Could not read that image");
  img.src = url; e.target.value = "";
});
$("imgUrl").addEventListener("input", (e) => {
  const v = e.target.value.trim();
  if (/^https:\/\/[^\s"'<>]+$/.test(v)) { draftAvatar = v; $("aAvatar").src = v; }
});
$("resetImg").addEventListener("click", () => { draftAvatar = ""; $("imgUrl").value = ""; $("aAvatar").src = defaultAvatar($("aName").value); });

$("pickTxt").addEventListener("click", () => $("txtFile").click());
$("txtFile").addEventListener("change", (e) => {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 2 * 1024 * 1024) { toast("File too large (max 2 MB)"); e.target.value = ""; return; }
  const r = new FileReader();
  r.onload = () => {
    const saved = { name: f.name.slice(0, 80), text: String(r.result || "") };
    if (LS.set("as2_file", saved)) { chatFile = saved; toast("File loaded"); }
    else toast("File too large for this browser");
    updateTxtInfo();
  };
  r.readAsText(f); e.target.value = "";
});
$("clearTxt").addEventListener("click", () => { chatFile = { name: "", text: "" }; LS.del("as2_file"); updateTxtInfo(); });

$("findModels").addEventListener("click", async () => {
  const st = $("modelStatus"), list = $("modelList");
  list.textContent = ""; st.textContent = "Checking...";
  if (!adminValid()) { st.textContent = "Admin session expired. Close and open the panel again."; return; }
  try {
    const r = await api("/api/models", {}, admin.token);
    if (!r.ok) { st.textContent = "Error: " + (r.data.error || "failed"); return; }
    const models = r.data.models || [];
    if (!models.length) { st.textContent = "Key works, but no chat models were found."; return; }
    st.textContent = "Key works. Tap a model to use it:";
    models.forEach((n) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn small"; b.textContent = n;
      b.addEventListener("click", () => { $("aModel").value = n; st.textContent = "Selected: " + n + ". Now tap Save changes."; });
      list.appendChild(b);
    });
  } catch (e) { st.textContent = "Network error."; }
});

function saveAdmin() {
  if (!okAvatar(draftAvatar)) { toast("Picture link must start with https://"); return; }
  const model = $("aModel").value.trim();
  if (model && !/^[a-zA-Z0-9._-]{3,80}$/.test(model)) { toast("Model name looks invalid"); return; }
  cfg = {
    name: $("aName").value.trim() || DEFAULTS.name,
    greeting: $("aGreet").value.trim() || DEFAULTS.greeting,
    prompt: $("aPrompt").value.trim() || DEFAULTS.prompt,
    model: model || DEFAULTS.model,
    avatar: draftAvatar
  };
  if (!LS.set("as2_cfg", cfg)) { toast("Could not save (storage full)"); return; }
  applyProfile(); renderAll(); closeAdmin(); toast("Saved");
}
$("aSave").addEventListener("click", saveAdmin);
$("aSave2").addEventListener("click", saveAdmin);
$("aReset").addEventListener("click", () => {
  if (!confirm("Reset name, picture, behaviour and chat file to defaults?")) return;
  LS.del("as2_cfg"); LS.del("as2_file");
  cfg = Object.assign({}, DEFAULTS); chatFile = { name: "", text: "" };
  applyProfile(); renderAll(); closeAdmin(); toast("Reset done");
});

/* ---------- init ---------- */
applyProfile();
renderAll();
if (!siteValid()) autoLogin().then((ok) => { if (!ok) { addBubble({ role: "model", text: sessionError, err: true, ts: Date.now() }, true); scrollDown(); } });
})();
