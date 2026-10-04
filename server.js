require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname, { dotfiles: "deny" }));

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

app.get("/", (req, res) => res.redirect("/login.html"));

// Gemini style contents -> OpenAI style messages
function toMessages(contents = []) {
  return contents.map((c) => ({
    role: c.role === "model" ? "assistant" : "user",
    content: (c.parts || []).map((p) => p.text || "").join(""),
  }));
}

function sendToGroq(payload, key) {
  return fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });
}

app.post("/api/chat", async (req, res) => {
  try {
    const key = process.env.GROQ_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing GROQ_API_KEY" });

    const cfg = req.body.generationConfig || {};
    const payload = {
      model: MODEL,
      messages: toMessages(req.body.contents),
      temperature: cfg.temperature ?? 0.7,
      max_tokens: 1024,
    };

    let r = await sendToGroq(payload, key);
    if (r.status === 503 || r.status === 429) {
      await new Promise((s) => setTimeout(s, 1200));
      r = await sendToGroq(payload, key);
    }

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);

    // OpenAI style reply -> Gemini style reply
    const text = data?.choices?.[0]?.message?.content || "";
    res.json({ candidates: [{ content: { parts: [{ text }] } }] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
console.log("GROQ VERSION running, model:", MODEL);
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
