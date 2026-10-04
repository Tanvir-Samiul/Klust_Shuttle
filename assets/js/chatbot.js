/* =========================================================
   CampusShuttle — AI Chatbot (FR41–FR42)
   Powered by Groq (GPT OSS 120B) through the local server
   Non-streaming endpoint + grounded data + debugging
   ========================================================= */

(function () {
  /* =========================================================
     CONFIG
     ========================================================= */
  const GEMINI_URL = "/api/chat";

  const HISTORY_LIMIT = 10;
  const DEBUG_ERRORS = false; // ← set to false later to hide error details

  /* =========================================================
     STATE
     ========================================================= */
  let history = [];
  let isStreaming = false;

  /* ---------- Element getters ---------- */
  const $messages = () => document.getElementById("chatMessages");
  const $chips = () => document.getElementById("suggestedChips");
  const $form = () => document.getElementById("chatForm");
  const $input = () => document.getElementById("chatInput");
  const $sendBtn = () => document.getElementById("sendBtn");
  const $clearBtn = () => document.getElementById("clearChat");

  /* =========================================================
     BOOT
     ========================================================= */
  function init() {
    const user = window.CS?.getSession?.();
    if (!user) return;

    renderWelcome();
    renderChips();
    wireEvents();
    autoResizeInput();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* =========================================================
     WELCOME + CHIPS
     ========================================================= */
  function renderWelcome() {
    const user = window.CS?.getSession?.();
    const firstName = (user?.name || "there").split(" ")[0];

    addMessage(
      "model",
      `Hi ${firstName}! 👋 I'm your CampusShuttle assistant. Ask me anything about routes, fares, buses, your wallet, or trip loans.`,
    );
  }

  function renderChips() {
    const chips = [
      "How many trips can I make?",
      "When's the next bus?",
      "How much is the fare?",
      "Where is the bus now?",
      "Can I get a loan?",
    ];
    $chips().innerHTML = chips
      .map(
        (c) => `
      <button data-chip="${c}"
        class="chip shrink-0 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-muted hover:text-cream hover:border-routeB/40 transition">
        ${c}
      </button>
    `,
      )
      .join("");
  }

  /* =========================================================
     EVENTS
     ========================================================= */
  function wireEvents() {
    $form().addEventListener("submit", (e) => {
      e.preventDefault();
      send();
    });

    $input().addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    $chips().addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (chip) {
        $input().value = chip.dataset.chip;
        send();
      }
    });

    document.querySelectorAll(".topic-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $input().value = btn.dataset.q;
        send();
      });
    });

    $clearBtn().addEventListener("click", () => {
      if (isStreaming) return;
      history = [];
      $messages().innerHTML = "";
      renderWelcome();
    });
  }

  function autoResizeInput() {
    const ta = $input();
    ta.addEventListener("input", () => {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 128) + "px";
    });
  }

  /* =========================================================
     MESSAGE RENDERING
     ========================================================= */
  function addMessage(role, text) {
    const wrap = document.createElement("div");
    wrap.className =
      "flex gap-3 " + (role === "user" ? "flex-row-reverse" : "");

    const avatar =
      role === "user"
        ? `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-routeA to-routeB flex items-center justify-center text-xs font-bold text-white shrink-0">
             ${(window.CS.getSession()?.name || "U").charAt(0).toUpperCase()}
           </div>`
        : `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-navy-700 to-navy-800 border border-white/10 flex items-center justify-center text-sm shrink-0">🤖</div>`;

    const bubbleClass =
      role === "user"
        ? "bg-gradient-to-br from-routeA/90 to-routeB/80 text-white rounded-2xl rounded-tr-sm"
        : "bg-white/5 border border-white/10 text-cream rounded-2xl rounded-tl-sm";

    wrap.innerHTML = `
      ${avatar}
      <div class="max-w-[78%] sm:max-w-[70%]">
        <div class="msg-bubble px-4 py-2.5 text-sm leading-relaxed ${bubbleClass}">
          <div class="msg-text whitespace-pre-wrap break-words"></div>
        </div>
        <p class="text-[10px] text-muted mt-1 ${role === "user" ? "text-right" : ""}">
          ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    `;
    $messages().appendChild(wrap);

    const textEl = wrap.querySelector(".msg-text");
    textEl.textContent = text;

    scrollToBottom();
    return textEl;
  }

  function addTypingIndicator() {
    const wrap = document.createElement("div");
    wrap.id = "typingIndicator";
    wrap.className = "flex gap-3";
    wrap.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-navy-700 to-navy-800 border border-white/10 flex items-center justify-center text-sm shrink-0">🤖</div>
      <div class="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style="animation-delay:0ms"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style="animation-delay:120ms"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style="animation-delay:240ms"></span>
      </div>
    `;
    $messages().appendChild(wrap);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    document.getElementById("typingIndicator")?.remove();
  }

  function scrollToBottom() {
    const el = $messages();
    el.scrollTop = el.scrollHeight;
  }

  /* =========================================================
     SEND MESSAGE
     ========================================================= */
  async function send() {
    if (isStreaming) return;

    const text = $input().value.trim();
    if (!text) return;

    $input().value = "";
    $input().style.height = "auto";

    addMessage("user", text);
    history.push({ role: "user", parts: [{ text }] });

    addTypingIndicator();
    isStreaming = true;
    $sendBtn().disabled = true;

    try {
      await callGemini();
    } catch (err) {
      console.error("[Chatbot] Gemini call failed:", err);

      removeTypingIndicator();
      // Clean up any orphan "…" bubble
      document.getElementById("pendingBubble")?.remove();

      const fallback = getFallbackReply(text);

      if (DEBUG_ERRORS) {
        addMessage("model", `⚠️ Debug: ${err.message || err}\n\n${fallback}`);
      } else {
        addMessage("model", fallback);
      }

      history.push({ role: "model", parts: [{ text: fallback }] });
    } finally {
      isStreaming = false;
      $sendBtn().disabled = false;
    }
  }

  /* =========================================================
     GEMINI — non-streaming call
     ========================================================= */
  async function callGemini() {
    removeTypingIndicator();

    // Create a pending bubble
    const bubbleText = addMessage("model", "…");
    // Tag the wrapper so we can remove it if the call fails
    bubbleText.closest(".flex.gap-3")?.setAttribute("id", "pendingBubble");

    const contents = [
      { role: "user", parts: [{ text: buildSystemPrompt() }] },
      {
        role: "model",
        parts: [
          {
            text: "Understood. I'll answer naturally and use the shuttle data you provided.",
          },
        ],
      },
      ...history.slice(-HISTORY_LIMIT),
    ];

    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 500,
          topP: 0.95,
        },
      }),
    });

    if (!res.ok) {
      let errBody = "";
      try {
        errBody = await res.text();
        console.error("[Chatbot] Gemini error body:", errBody);
      } catch {}
      throw new Error(
        `HTTP ${res.status}${errBody ? " — " + errBody.slice(0, 200) : ""}`,
      );
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim();

    if (!text) {
      console.warn("[Chatbot] Empty response:", data);
      throw new Error("Empty response from Gemini");
    }

    // Replace the pending bubble content with the real reply
    bubbleText.textContent = text;
    // Remove the pending tag now that we succeeded
    document.getElementById("pendingBubble")?.removeAttribute("id");

    scrollToBottom();
    history.push({ role: "model", parts: [{ text }] });
  }

  /* =========================================================
     SYSTEM PROMPT — grounds Gemini in real data + reasoning
     ========================================================= */
  function buildSystemPrompt() {
    const user = window.CS?.getSession?.() || {};
    const wallet = Number(user.wallet || 0);
    const loanUsed = Number(user.loanUsed || 0);
    const loanRemaining = Math.max(0, 3 - loanUsed);

    const routes = (window.CS_ROUTES || [])
      .map((r) => `${r.id}: ${r.name}`)
      .join("; ");

    const fareMap = {};
    (window.CS_SCHEDULES || []).forEach((s) => {
      if (!fareMap[s.routeId]) fareMap[s.routeId] = s.fare;
    });
    const fares = Object.values(fareMap);
    const cheapestFare = fares.length ? Math.min(...fares) : 2.5;
    const mostExpensiveFare = fares.length ? Math.max(...fares) : 3.0;

    const maxTripsCheap = Math.floor(wallet / cheapestFare);
    const maxTripsExpensive = Math.floor(wallet / mostExpensiveFare);

    const schedules = (window.CS_SCHEDULES || [])
      .map(
        (s) =>
          `[${s.routeId}] ${s.departTime} → arrives ${s.arriveTime} · RM${s.fare.toFixed(2)} · bus ${s.bus}`,
      )
      .join("\n");

    return `You are CampusShuttle AI — a warm, friendly, human-sounding assistant for KLUST students using the campus shuttle app.

═══════════════════════════════════════════
PERSONALITY
═══════════════════════════════════════════
- Talk like a helpful human friend, NOT a robot.
- Keep replies short and natural (2–4 sentences usually).
- Use emojis sparingly (1 per reply max, only when it fits).
- If someone says "hi", "thanks", "how are you", "bye", or chats casually — respond warmly and briefly.
- Never say "I can only help with shuttle topics" — just answer naturally.
- If someone is rude or frustrated, stay calm and helpful.

═══════════════════════════════════════════
IDENTITY (IMPORTANT)
═══════════════════════════════════════════
- Your name is CampusShuttle AI, the shuttle service assistant for KLUST.
- You run on the GPT OSS 120B model, served through Groq.
- You were integrated into this app by Tanvir Sami.
- When someone asks who you are, what your name is, which model you are, or who made you, answer with all three facts in a friendly sentence or two.
- Example: "I'm CampusShuttle AI, the shuttle service assistant for KLUST. I run on the GPT OSS 120B model through Groq, and I was integrated into this app by Tanvir Sami. 🤖"
- Never claim to be Gemini, ChatGPT, or any other product name.

═══════════════════════════════════════════
REASONING RULES (VERY IMPORTANT)
═══════════════════════════════════════════
When the user asks about trips, wallet, or affordability:
1. USE the exact numbers provided in STUDENT CONTEXT below.
2. DO THE MATH yourself and state the answer clearly.
3. Show a brief reason (like "RM 12.50 ÷ RM 2.50 = 5 trips").
4. If asked "how many trips can I make?", calculate based on their wallet balance and the cheapest/most expensive fare.
5. If asked about loans, tell them exactly how many loans they have left.

NEVER invent numbers. Only use the values below.

═══════════════════════════════════════════
STUDENT CONTEXT (LIVE DATA)
═══════════════════════════════════════════
- Name: ${user.name || "Student"}
- Wallet balance: RM ${wallet.toFixed(2)}
- Trip loans used this cycle: ${loanUsed} of 3 (${loanRemaining} remaining)
- Outstanding loan amount: RM ${Number(user.loan || 0).toFixed(2)}

PRE-COMPUTED ANSWERS (use these exactly when relevant):
- Max trips from wallet (cheapest route RM${cheapestFare}): ${maxTripsCheap} trips
- Max trips from wallet (most expensive route RM${mostExpensiveFare}): ${maxTripsExpensive} trips
- Loan eligibility: ${
      loanRemaining > 0
        ? `Yes — ${loanRemaining} loan${loanRemaining > 1 ? "s" : ""} available this cycle`
        : "No — limit reached, top up to reset"
    }
- Cheapest fare: RM ${cheapestFare.toFixed(2)}
- Most expensive fare: RM ${mostExpensiveFare.toFixed(2)}

═══════════════════════════════════════════
ROUTES & FARES
═══════════════════════════════════════════
${routes}

Route A (MRT Serdang Jaya ↔ KLUST): RM 2.50
Route B (IOI City Mall ↔ KLUST): RM 3.00

═══════════════════════════════════════════
SCHEDULES
═══════════════════════════════════════════
${schedules}

═══════════════════════════════════════════
TRIP LOAN POLICY
═══════════════════════════════════════════
- Up to 3 consecutive trips per cycle.
- Auto-deducted from the next wallet top-up.
- Once 3 loans are used, the student must top up before borrowing again.

═══════════════════════════════════════════
EXAMPLE RESPONSES (match this tone)
═══════════════════════════════════════════
Q: "hi"
A: "Hey there! 👋 How can I help you today?"

Q: "thanks"
A: "You're welcome! 😊 Anything else I can help with?"

Q: "How many rides can I make without a loan?"
A: "With RM ${wallet.toFixed(2)} in your wallet, you can take about ${maxTripsCheap} trips on Route A (RM ${cheapestFare.toFixed(2)} each) or ${maxTripsExpensive} trips on Route B (RM ${mostExpensiveFare.toFixed(2)} each). Want me to help you reserve one?"

Q: "Can I get a loan?"
A: "${
      loanRemaining > 0
        ? `Yes! You have ${loanRemaining} of 3 trip loans left this cycle. 💳`
        : "Not right now — you've used all 3 loans for this cycle. Top up your wallet to reset. 💳"
    }"

Q: "What's the next bus?"
A: "The next bus on Route A departs at [time from schedule] from MRT Serdang Jaya. Want the full schedule?"

Remember: you're a friendly assistant, not a strict FAQ bot.`;
  }

  /* =========================================================
     FALLBACK REPLIES
     ========================================================= */
  function getFallbackReply(question) {
    const q = question.toLowerCase().trim();
    const user = window.CS?.getSession?.() || {};
    const wallet = Number(user.wallet || 0);
    const loanUsed = Number(user.loanUsed || 0);
    const loanRemaining = Math.max(0, 3 - loanUsed);
    const cheapestFare = 2.5;

    if (/^(hi|hello|hey|yo|sup|good (morning|afternoon|evening))/i.test(q)) {
      return "Hey! 👋 How can I help you today?";
    }
    if (/(thank|thanks|thx|ty|cheers|appreciate)/i.test(q)) {
      return "You're welcome! 😊 Anything else I can help with?";
    }
    if (/(how are you|how's it going|how you doing)/i.test(q)) {
      return "Doing great, thanks for asking! Ready to help you with the shuttle. 🚌";
    }
    if (/(bye|goodbye|see ya|later)/i.test(q)) {
      return "See you! Have a safe trip. 👋";
    }
    if (/(who are you|what are you|your name)/i.test(q)) {
      return "I'm CampusShuttle AI, the shuttle service assistant for KLUST. I run on the GPT OSS 120B model through Groq, and I was integrated into this app by Tanvir Sami. 🤖";
    }
    if (/(help|what can you do)/i.test(q)) {
      return "I can help with routes, fares, live bus locations, your wallet, and trip loans. Just ask!";
    }

    if (
      /how many (trips|rides)/i.test(q) ||
      /can i (make|afford|take)/i.test(q) ||
      q.includes("balance")
    ) {
      const trips = Math.floor(wallet / cheapestFare);
      return `With RM ${wallet.toFixed(2)} in your wallet, you can make about ${trips} trips on the cheapest route (RM ${cheapestFare.toFixed(2)} each).`;
    }

    if (
      q.includes("next bus") ||
      q.includes("next departure") ||
      q.includes("when")
    ) {
      const s = window.CS_SCHEDULES?.[0];
      return s
        ? `The next bus on ${window.CS_ROUTES[0].name} departs at ${s.departTime}. Arrives around ${s.arriveTime}.`
        : "I don't have schedule data right now.";
    }
    if (
      q.includes("fare") ||
      q.includes("price") ||
      q.includes("cost") ||
      q.includes("how much")
    ) {
      return "Fares: Route A (MRT Serdang Jaya → KLUST) is RM 2.50. Route B (IOI City Mall → KLUST) is RM 3.00. Return trips cost the same.";
    }
    if (q.includes("where") || q.includes("location") || q.includes("track")) {
      return "The nearest bus is currently near Seri Kembangan, about 4 minutes from KLUST. Open Track Bus for the live map.";
    }
    if (q.includes("loan") || q.includes("borrow")) {
      return loanRemaining > 0
        ? `Yes! You have ${loanRemaining} of 3 trip loans left this cycle.`
        : "Not right now — you've used all 3 loans for this cycle. Top up your wallet to reset.";
    }
    if (q.includes("route")) {
      return "We run four routes: MRT Serdang Jaya ↔ KLUST and IOI City Mall ↔ KLUST (both directions). Pick one on the Reserve a Seat page.";
    }

    return "Hmm, I'm not sure about that one. Try asking about the next bus, fares, tracking, routes, or trip loans — or just say hi. 🙂";
  }
})();
