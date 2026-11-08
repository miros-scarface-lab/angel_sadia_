# 💖 Angel Sadia — Instagram Love DM Girlfriend AI

> **"Khaiso? Don’t say no, I can already guess 😒❤️"**

A pure, distraction-free **Instagram Love DM** web chat featuring **Angel Sadia**, a loving, caring, and playful Bangladeshi girlfriend powered by Google Gemini.

---

## ✨ Features

- **Pure Instagram Love DM Interface**:
  - Distraction-free direct messaging interface matching Instagram DM.
  - Signature Instagram Love gradient bubbles (`#ff1b6b` → `#ff4582` → `#9b51e0`).
  - Minimal top navigation bar with active online status, doll profile photo, and options.
  - Double-tap or double-click any message to trigger a bursting Instagram ❤️ heart reaction badge with floating romantic hearts.
  - Minimal text composer with auto-expanding `Message...` textarea and quick-tap ❤️ love button.
  - Three-dot menu (`⋯`) with **Clear Chat** (with Instagram-style confirmation dialog), **View Profile**, **Dark Mode Toggle**, and **Export Chat**.
- **Authentic Bangladeshi Girlfriend Persona**:
  - Texts naturally in conversational Banglish, everyday Bengali, or English.
  - Affectionate, playful, with cute "অভিমান" (playful sulking when you are late or busy) that melts away with sweet love.
  - Realistic texting style: short, natural 1–3 sentence texts with cute emojis.
- **Lightning Fast Responses**:
  - Powered by `gemini-3.5-flash-lite` for instantaneous ~1.2s replies with zero fake delays.
  - Pre-configured default Gemini API key for instant out-of-the-box local and Vercel usage.
- **Permanent Google Sheets Chat Logging (Optional)**:
  - Automatically logs every visitor's individual chat session row-by-row into a private Google Spreadsheet.
  - Even if users clear their chat on their device, your Google Sheet keeps a permanent record!
  - 100% free, setup takes 2 minutes using `google-sheet-script.js`.
- **Sound Effects & Floating Hearts**:
  - Soft romantic Web Audio chimes for sent, received, and heart reactions.
  - Floating romantic heart particles.
- **Keepsake Export & Dark Mode**:
  - Toggle between Instagram Love Light and Midnight Dark themes.
  - Export chat transcript as a saved keepsake file.

---

## 🚀 Running Locally

Requires **Node.js 18** or newer. No third-party npm packages required (pure zero-dependency standard library).

```bash
# 1. Start the server
npm start

# 2. Open in your browser
http://localhost:3000
```

---

## 📊 Google Sheets Chat Logging (2-Minute Setup)

To permanently log user conversations into a Google Sheet:

1. Open [sheets.new](https://sheets.new) and create a sheet named **`Angel Sadia Chat Logs`**.
2. Go to **Extensions** → **Apps Script**, delete the template, and paste the code from [`google-sheet-script.js`](./google-sheet-script.js).
3. Click **Deploy** → **New deployment** → Select type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the Web app URL and add it to your `.env` or Vercel Environment Variables:
   ```env
   GOOGLE_SHEET_WEBHOOK_URL="https://script.google.com/macros/s/AKfycb.../exec"
   ```

---

## 📁 Clean Project Structure

```
angel-sadia/
├── package.json              # Node.js project manifest (zero dependencies)
├── server.mjs                # Standalone Node.js server & Gemini proxy
├── vercel.json               # Vercel serverless deployment config
├── google-sheet-script.js    # Google Apps Script code for spreadsheet logging
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore
├── README.md                 # Documentation
├── api/                      # Vercel serverless functions
│   ├── _lib.js               # Shared utilities & Gemini helpers
│   ├── chat.js               # /api/chat endpoint with session logging
│   ├── models.js             # /api/models endpoint
│   └── health.js             # /api/health endpoint
└── public/                   # Frontend client assets
    ├── index.html            # Instagram Love DM layout
    ├── style.css             # Instagram Love DM styling & animations
    ├── app.js                # Frontend chat client & audio synthesizer
    ├── profile.jpg           # Angel Sadia doll profile picture
    └── manifest.json         # PWA manifest
```
