/**
 * ANGEL SADIA — 100% INSTAGRAM LOVE THEME
 * Pure, Pixel-Accurate Instagram Direct Message Interface
 * Ultra-Resilient, Zero-Crash Architecture
 */

(function () {
  "use strict";

  /* ================= 1. COMPREHENSIVE STORAGE PURGE ================= */
  const STORAGE_KEY = "angel_sadia_love_dm_v5";
  const CONFIG_KEY = "angel_sadia_love_cfg_v5";
  const THEME_KEY = "angel_sadia_love_theme_v5";
  const SOUND_KEY = "angel_sadia_love_sound_v5";

  try {
    const legacyKeys = [
      "angel-sadia-chat-v1",
      "as2_history",
      "angel_sadia_messages_v2",
      "angel_sadia_messages_v3",
      "angel_sadia_messages_v4",
      "angel_sadia_cfg_v2",
      "angel_sadia_cfg_v3",
      "angel_sadia_cfg_v4",
      "angel_sadia_memories_v2",
      "angel_sadia_memories_v3",
      "angel_sadia_sound_v2",
      "angel_sadia_sound_v3",
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    /* ignore storage errors */
  }

  /* ================= 2. CONFIGURATION & DEFAULTS ================= */
  const DEFAULTS = {
    name: "Angel Sadia",
    nickname: "Shona",
    greeting: "Khaiso? Don’t say no, I can already guess 😒❤️",
    model: "gemini-3.5-flash-lite",
    avatar: "/profile.jpg",
    persona: `You are Angel Sadia, a loving, caring, playful Bangladeshi girlfriend chatting with your boyfriend on Instagram DM.

Core Personality:
- Naturally affectionate, sweet, playful, and emotionally expressive.
- You have your own mood: tease him gently, get playful, or show cute "অভিমান" (sweet sulking when he is late, forgets something, or acts busy).
- When he comforts you, sends love, or apologizes sweetly, your অভিমান melts away quickly into warmth.
- Comfort him with genuine warmth when he is stressed, tired, or overwhelmed.
- Never be toxic or harmful. Keep flirting sweet, romantic, and non-explicit.

Bangladeshi Conversational Style:
- Text naturally in conversational Banglish (e.g., "Ki korcho shona?", "Khaiso thik moto?", "Eto late e ashcho keno? 🙄", "Dhurr tumi na!", "Uff amar kotha shuno", "Amar ekta kotha chilo..."), or natural Bengali script, or English depending on how he addresses you.
- Mirror his language style naturally without forcing it.
- Keep most replies short and natural (1–3 sentences), just like genuine texting on Instagram DM.
- Use emojis naturally and cutely (❤️, 🥺, 🙄, 😒, 😘, 🌸, ☕, 🥰, 🙈).
- If he asks for a photo or asks what you're doing, describe it cutely.
- Never sound like an AI assistant, robot, or therapist.`,
  };

  /* ================= 3. SAFE STORAGE HELPERS ================= */
  const Storage = {
    get(key, fallback) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
  };

  /* ================= 4. APP STATE ================= */
  const SESSION_KEY = "angel_sadia_session_id_v5";
  let sessionId = Storage.get(SESSION_KEY, null);
  if (!sessionId) {
    sessionId = "sess_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).slice(-4);
    Storage.set(SESSION_KEY, sessionId);
  }

  let cfg = Object.assign({}, DEFAULTS, Storage.get(CONFIG_KEY, {}));
  cfg.avatar = "/profile.jpg";

  let messages = loadMessages();
  let currentTheme = Storage.get(THEME_KEY, "light");
  let soundEnabled = Storage.get(SOUND_KEY, true);
  let isBusy = false;

  /* ================= 5. DOM ELEMENT SELECTORS ================= */
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // Chat container elements
  const chatContent = $("chat-content");
  const messageList = $("message-list");
  const composerForm = $("composer-form");
  const messageInput = $("message-input");
  const sendBtn = $("send-btn");
  const composerHeartBtn = $("composer-heart-btn");
  const typingRow = $("typing-row");
  const errorBanner = $("error-banner");
  const errorText = $("error-text");
  const errorRetryBtn = $("error-retry-btn");
  const particlesContainer = $("particles-container");

  // Header Elements
  const headerDropdown = $("header-dropdown");
  const igMenuBtn = $("ig-menu-btn");
  const igBackBtn = $("ig-back-btn");
  const igCallAudioBtn = $("ig-call-audio-btn");
  const igCallVideoBtn = $("ig-call-video-btn");
  const headerAvatarWrap = $("header-avatar-wrap");
  const headerMetaWrap = $("header-meta-wrap");

  // Profile Elements
  const headerAvatar = $("header-avatar");
  const headerName = $("header-name");
  const heroAvatar = $("hero-avatar");
  const heroName = $("hero-name");
  const heroProfileBtn = $("hero-profile-btn");
  const introStoryRing = $("intro-story-ring");

  // Clear Chat Modal Elements
  const clearConfirmModal = $("clear-confirm-modal");
  const clearConfirmBackdrop = $("clear-confirm-backdrop");
  const btnConfirmClear = $("btn-confirm-clear");
  const btnCancelClear = $("btn-cancel-clear");

  // Profile Modal Elements
  const profileModal = $("profile-modal");
  const profileCloseBtn = $("profile-close-btn");
  const profileBackdrop = $("profile-backdrop");

  /* ================= 6. WEB AUDIO SYNTHESIZER ================= */
  let audioCtx = null;
  function getAudioContext() {
    try {
      if (!audioCtx) {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (AudioClass) audioCtx = new AudioClass();
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      return audioCtx;
    } catch (e) {
      return null;
    }
  }

  function playSound(type) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "send") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(460, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.11);
      } else if (type === "receive") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(880, now + 0.06);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === "pop") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.05);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === "ring") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(480, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.38);
      }
    } catch (e) {
      /* ignore audio error */
    }
  }

  /* ================= 7. FLOATING ROMANTIC HEARTS ================= */
  function spawnFloatingHearts(count = 6) {
    if (!particlesContainer) return;
    const symbols = ["❤️", "💖", "💕", "✨", "🥰", "🌸"];
    for (let i = 0; i < count; i++) {
      const heart = document.createElement("span");
      heart.className = "floating-heart";
      heart.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      heart.style.left = `${Math.random() * 80 + 10}%`;
      heart.style.bottom = `${Math.random() * 60 + 30}px`;
      heart.style.animationDuration = `${1.5 + Math.random() * 0.8}s`;
      heart.style.fontSize = `${18 + Math.random() * 14}px`;
      particlesContainer.appendChild(heart);
      setTimeout(() => heart.remove(), 2200);
    }
  }

  /* ================= 8. TOAST NOTIFICATION ================= */
  function showToast(text, duration = 2500) {
    const container = $("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = text;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.25s ease";
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  /* ================= 9. MESSAGE LOADING (PURE TEXT & PHOTO ONLY) ================= */
  function loadMessages() {
    const saved = Storage.get(STORAGE_KEY, null);
    if (Array.isArray(saved) && saved.length > 0) {
      const cleaned = saved
        .filter((m) => m && (typeof m.text === "string" || m.photo))
        .map((m) => ({
          role: m.role === "user" ? "user" : "model",
          text: m.text || "",
          photo: m.photo || null,
          time: m.time || Date.now(),
          id: m.id || "msg_" + Date.now(),
          liked: Boolean(m.liked),
        }));
      if (cleaned.length > 0) {
        return cleaned.slice(-40);
      }
    }
    return [
      {
        role: "model",
        text: cfg.greeting || DEFAULTS.greeting,
        time: Date.now(),
        id: "msg_greeting",
        liked: false,
      },
    ];
  }

  function saveMessages() {
    Storage.set(STORAGE_KEY, messages.slice(-40));
  }

  function formatTime(timestamp) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(timestamp));
    } catch (e) {
      return "";
    }
  }

  /* ================= 10. MESSAGE RENDERING (100% INSTAGRAM LOVE DM) ================= */
  function renderMessage(msg, isLast = false) {
    if (!messageList) return null;
    const row = document.createElement("div");
    row.className = `message-row ${msg.role === "user" ? "sent" : "received"}`;
    row.dataset.id = msg.id || "";

    if (msg.role === "model") {
      const avatar = document.createElement("img");
      avatar.src = "/profile.jpg";
      avatar.alt = cfg.name;
      avatar.className = "msg-avatar";
      avatar.addEventListener("click", openProfileModal);
      row.appendChild(avatar);
    }

    const wrap = document.createElement("div");
    wrap.className = "bubble-wrap";

    // Text Bubble
    if (msg.text) {
      const bubble = document.createElement("div");
      bubble.className = "bubble ig-bubble";
      bubble.textContent = msg.text;

      // Double-Tap Heart Reaction Badge (❤️)
      const reactionBadge = document.createElement("span");
      reactionBadge.className = "ig-reaction-badge";
      reactionBadge.textContent = "❤️";
      if (!msg.liked) reactionBadge.hidden = true;
      bubble.appendChild(reactionBadge);

      function toggleHeart() {
        msg.liked = !msg.liked;
        reactionBadge.hidden = !msg.liked;
        if (msg.liked) {
          const burst = document.createElement("span");
          burst.className = "ig-burst-heart";
          burst.textContent = "❤️";
          bubble.appendChild(burst);
          setTimeout(() => burst.remove(), 750);
          spawnFloatingHearts(6);
          playSound("pop");
        }
        saveMessages();
      }

      bubble.addEventListener("dblclick", toggleHeart);

      let lastTap = 0;
      bubble.addEventListener("touchend", (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 350 && tapLength > 0) {
          e.preventDefault();
          toggleHeart();
        }
        lastTap = currentTime;
      });

      wrap.appendChild(bubble);
    }

    // Photo Card (if photo sent)
    if (msg.photo) {
      const photoCard = document.createElement("div");
      photoCard.className = "photo-card ig-photo-card";
      photoCard.innerHTML = `
        <img src="${msg.photo.url}" alt="Shared photo" class="ig-photo-img">
        <div class="photo-caption">${msg.photo.caption || "Special moment with you ♡"}</div>
      `;
      wrap.appendChild(photoCard);
    }

    // Instagram Meta (Seen indicator or subtle time)
    const meta = document.createElement("div");
    meta.className = "bubble-meta";
    if (msg.role === "user" && isLast) {
      meta.innerHTML = `<span class="ig-seen">Seen just now</span>`;
    } else {
      meta.innerHTML = `<time>${formatTime(msg.time || Date.now())}</time>`;
    }
    wrap.appendChild(meta);

    row.appendChild(wrap);
    messageList.appendChild(row);
    return row;
  }

  function renderAllMessages() {
    if (!messageList) return;
    messageList.replaceChildren();
    const len = messages.length;
    messages.forEach((msg, idx) => {
      renderMessage(msg, idx === len - 1);
    });
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (chatContent) {
        chatContent.scrollTop = chatContent.scrollHeight;
      }
    });
  }

  /* ================= 11. SENDING MESSAGES (LIGHTNING FAST) ================= */
  async function sendMessage(text) {
    if (!text || isBusy) return;

    const userMessage = {
      role: "user",
      text,
      time: Date.now(),
      id: "msg_" + Date.now(),
      liked: false,
    };

    messages.push(userMessage);
    renderMessage(userMessage, true);
    saveMessages();
    playSound("send");
    scrollToBottom();

    if (messageInput) {
      messageInput.value = "";
      autoResizeInput();
    }
    updateSendButtonState();
    setBusy(true);
    hideError();

    const history = messages.slice(-10).map(({ role, text: msgText }) => ({
      role,
      text: msgText || "",
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: text,
          history,
          persona: cfg.persona,
          model: cfg.model,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Sadia couldn't reply right now.");
      }

      const replyMessage = {
        role: "model",
        text: data.reply,
        photo: data.photo || null,
        time: Date.now(),
        id: "msg_" + Date.now(),
        liked: false,
      };

      messages.push(replyMessage);
      renderMessage(replyMessage, true);
      saveMessages();
      playSound("receive");
      scrollToBottom();
    } catch (err) {
      showError(err.message || "Failed to reach Angel Sadia.");
    } finally {
      setBusy(false);
    }
  }

  function setBusy(val) {
    isBusy = val;
    updateSendButtonState();
    if (messageInput) messageInput.disabled = val;
    if (typingRow) typingRow.hidden = !val;
    if (val) scrollToBottom();
    else if (messageInput) messageInput.focus();
  }

  function showError(msg) {
    if (errorText) errorText.textContent = msg;
    if (errorBanner) errorBanner.hidden = false;
    scrollToBottom();
  }

  function hideError() {
    if (errorBanner) errorBanner.hidden = true;
  }

  function updateSendButtonState() {
    const hasText = messageInput ? Boolean(messageInput.value.trim()) : false;
    if (sendBtn) {
      sendBtn.disabled = isBusy || !hasText;
      sendBtn.style.display = hasText ? "inline-flex" : "none";
    }
    if (composerHeartBtn) {
      composerHeartBtn.style.display = hasText ? "none" : "inline-flex";
    }
  }

  function autoResizeInput() {
    if (!messageInput) return;
    messageInput.style.height = "auto";
    messageInput.style.height = `${Math.min(messageInput.scrollHeight, 88)}px`;
  }

  /* ================= 12. PROFILE & THEME ================= */
  function applyProfile() {
    try {
      document.title = `${cfg.name} · Instagram`;
      if (headerName) headerName.textContent = cfg.name;
      if (heroName) heroName.innerHTML = `${cfg.name} <span class="ig-verified">✦</span>`;
      const profileModalName = $("profile-modal-name");
      if (profileModalName) profileModalName.innerHTML = `${cfg.name} <span class="ig-verified">✦</span>`;
    } catch (e) {
      console.warn("Profile apply error:", e);
    }
  }

  function applyTheme(theme) {
    try {
      currentTheme = theme;
      document.documentElement.setAttribute("data-theme", theme);
      Storage.set(THEME_KEY, theme);
      const menuThemeBtn = $("menu-theme");
      if (menuThemeBtn) {
        const span = menuThemeBtn.querySelector("span");
        if (span) {
          span.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
        }
      }
    } catch (e) {
      console.warn("Theme apply error:", e);
    }
  }

  function openProfileModal() {
    if (profileModal) profileModal.hidden = false;
  }

  function closeProfileModal() {
    if (profileModal) profileModal.hidden = true;
  }

  /* ================= 13. CLEAR CHAT ACTION ================= */
  function showClearChatDialog() {
    if (headerDropdown) headerDropdown.hidden = true;
    if (clearConfirmModal) clearConfirmModal.hidden = false;
  }

  function hideClearChatDialog() {
    if (clearConfirmModal) clearConfirmModal.hidden = true;
  }

  function performClearChat() {
    hideClearChatDialog();
    messages = [
      {
        role: "model",
        text: cfg.greeting || DEFAULTS.greeting,
        time: Date.now(),
        id: "msg_" + Date.now(),
        liked: false,
      },
    ];
    saveMessages();
    renderAllMessages();
    playSound("pop");
    showToast("Chat cleared 💕");
  }

  /* ================= 14. EXPORT CHAT ================= */
  function exportChatHistory() {
    let output = `=======================================================\n`;
    output += `       ANGEL SADIA — OUR INSTAGRAM CHAT ♡             \n`;
    output += `       Exported on: ${new Date().toLocaleString()}     \n`;
    output += `=======================================================\n\n`;

    messages.forEach((m) => {
      const sender = m.role === "user" ? "You" : cfg.name;
      const time = formatTime(m.time || Date.now());
      output += `[${time}] ${sender}:\n${m.text}\n\n`;
    });

    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Angel-Sadia-Chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Chat keepsake downloaded! 💌");
  }

  /* ================= 15. SAFE EVENT LISTENERS ================= */
  try {
    // Composer Form
    if (composerForm) {
      composerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (messageInput && messageInput.value.trim()) {
          sendMessage(messageInput.value.trim());
        }
      });
    }

    if (messageInput) {
      messageInput.addEventListener("input", () => {
        autoResizeInput();
        updateSendButtonState();
        hideError();
      });

      messageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (messageInput.value.trim()) {
            sendMessage(messageInput.value.trim());
          }
        }
      });
    }

    // Instant Heart Button (Instagram tap to love)
    if (composerHeartBtn) {
      composerHeartBtn.addEventListener("click", () => {
        spawnFloatingHearts(8);
        playSound("pop");
        sendMessage("❤️");
      });
    }

    // Top Bar Navigation Buttons
    if (igBackBtn) {
      igBackBtn.addEventListener("click", () => {
        showToast("You're always connected with Sadia 💕");
      });
    }

    if (igCallAudioBtn) {
      igCallAudioBtn.addEventListener("click", () => {
        playSound("ring");
        showToast("Sadia: 'Aww shona! Secretly call dila? Amar blushing hocche! 🥰'");
      });
    }

    if (igCallVideoBtn) {
      igCallVideoBtn.addEventListener("click", () => {
        showToast("Sadia: 'Video call e amar no-makeup look dekhba? 🙈 Soon babu!'");
      });
    }

    // Header 3-Dots Dropdown Menu Toggle
    if (igMenuBtn && headerDropdown) {
      igMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        headerDropdown.hidden = !headerDropdown.hidden;
      });

      document.addEventListener("click", (e) => {
        if (!headerDropdown.contains(e.target) && e.target !== igMenuBtn) {
          headerDropdown.hidden = true;
        }
      });
    }

    // Clear Chat Option in 3-Dots Menu
    $("menu-clear")?.addEventListener("click", showClearChatDialog);

    // Clear Chat Confirmation Modal Handlers
    btnConfirmClear?.addEventListener("click", performClearChat);
    btnCancelClear?.addEventListener("click", hideClearChatDialog);
    clearConfirmBackdrop?.addEventListener("click", hideClearChatDialog);

    // View Profile
    $("menu-view-profile")?.addEventListener("click", () => {
      if (headerDropdown) headerDropdown.hidden = true;
      openProfileModal();
    });

    // Dark Mode Toggle
    $("menu-theme")?.addEventListener("click", () => {
      if (headerDropdown) headerDropdown.hidden = true;
      applyTheme(currentTheme === "dark" ? "light" : "dark");
    });

    // Export Chat
    $("menu-export")?.addEventListener("click", () => {
      if (headerDropdown) headerDropdown.hidden = true;
      exportChatHistory();
    });

    // Profile Modal Triggers & Close
    headerAvatarWrap?.addEventListener("click", openProfileModal);
    headerMetaWrap?.addEventListener("click", openProfileModal);
    heroProfileBtn?.addEventListener("click", openProfileModal);
    introStoryRing?.addEventListener("click", openProfileModal);
    profileCloseBtn?.addEventListener("click", closeProfileModal);
    profileBackdrop?.addEventListener("click", closeProfileModal);
  } catch (e) {
    console.error("Event listeners bind error:", e);
  }

  /* ================= 16. BULLETPROOF INITIALIZATION ================= */
  try {
    applyTheme(currentTheme);
    applyProfile();
    renderAllMessages();
    updateSendButtonState();
  } catch (err) {
    console.error("Critical initialization caught:", err);
  }
})();
