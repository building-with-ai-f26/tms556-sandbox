// Ghostwriter · Build 2 local backend.
// Run from the repo root:  node --env-file=.env app/server.js
// Then open http://localhost:3000
//
// This file runs in Node on YOUR computer, never in the browser.
// It is the only place that sees OPENROUTER_API_KEY.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 3000; // Render sets PORT
const HOST = "0.0.0.0"; // listen on all interfaces so Render can route traffic in

// Browser origins allowed to call /api/draft. Render sets RENDER_EXTERNAL_URL
// to this service's https://<name>.onrender.com address automatically.
const ALLOWED_ORIGINS = new Set(
  [process.env.RENDER_EXTERNAL_URL, `http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`].filter(Boolean)
);
const MODEL = "anthropic/claude-haiku-5.5"; // $0.10 in / $0.50 out per million tokens
const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY || API_KEY.includes("replace-with-your-key")) {
  console.error("Missing OPENROUTER_API_KEY. Copy .env.example to .env and add your key.");
  process.exit(1);
}

const PAGE = path.join(__dirname, "index.html");

// Turn Carly's text + my example texts into instructions for the model.
function buildMessages(incoming, examples) {
  const exampleList = examples.map((t, i) => `${i + 1}. ${t}`).join("\n");
  return [
    {
      role: "system",
      content:
        "You write text-message replies on behalf of the user, in the user's own style. " +
        "Match their length, punctuation, capitalization, slang and emoji habits as shown in their examples. " +
        "Reply with only the text message itself: no quotes, no explanation, no options.",
    },
    {
      role: "user",
      content:
        `Here are some texts I've sent before, to show how I write:\n${exampleList}\n\n` +
        `My friend Carly just texted me:\n${incoming}\n\n` +
        "Write my reply to Carly.",
    },
  ];
}

async function draftReply(incoming, examples) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages: buildMessages(incoming, examples), max_tokens: 200 }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${data.error?.message || "unknown error"}`);
  }
  const draft = data.choices?.[0]?.message?.content?.trim();
  if (!draft) throw new Error("OpenRouter returned an empty reply.");
  return { draft, model: data.model || MODEL, usage: data.usage || null };
}

// Read the JSON body the browser sent (capped at 20 KB).
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 20000) { reject(new Error("Request too large.")); req.destroy(); }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error("Request was not valid JSON.")); }
    });
  });
}

// Rate limit for /api/draft: at most 10 requests per minute per visitor IP.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;
const hits = new Map(); // ip -> { start, count }

// On Render the visitor IP is the LAST address in X-Forwarded-For: Render's
// proxy appends it, while earlier entries can be faked by the client.
// Locally there is no proxy, so use the socket address.
function visitorIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",").pop().trim();
  }
  return req.socket.remoteAddress || "unknown";
}

// Returns true if this request is allowed, false if the IP is over the limit.
function allowRequest(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start >= RATE_WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT;
}

// Drop expired entries every minute so the map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) {
    if (now - entry.start >= RATE_WINDOW_MS) hits.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return fs.createReadStream(PAGE).pipe(res);
  }

  if (req.method === "POST" && req.url === "/api/draft") {
    // Catch anything unexpected so one bad request can't crash the server.
    try {
      if (!allowRequest(visitorIp(req))) {
        return send(res, 429, { error: "Too many requests. Try again in a minute." });
      }

      const origin = req.headers.origin;
      if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return send(res, 403, { error: "Origin not allowed." });
      }

      let input;
      try { input = await readJson(req); } catch (e) { return send(res, 400, { error: e.message }); }

      // Only a plain JSON object is valid (rejects null, arrays, strings, numbers).
      if (input === null || typeof input !== "object" || Array.isArray(input)) {
        return send(res, 400, { error: "Request must be a JSON object." });
      }

      const incoming = typeof input.incoming === "string" ? input.incoming.trim() : "";
      const examples = Array.isArray(input.examples)
        ? input.examples.filter(t => typeof t === "string" && t.trim()).map(t => t.trim())
        : [];
      if (!incoming) return send(res, 400, { error: "Paste Carly's text first." });
      if (examples.length < 3 || examples.length > 5) {
        return send(res, 400, { error: "Add 3 to 5 of your own texts as style examples." });
      }

      try {
        const result = await draftReply(incoming, examples);
        console.log(`Drafted reply (${result.usage?.prompt_tokens ?? "?"} in / ${result.usage?.completion_tokens ?? "?"} out tokens)`);
        return send(res, 200, result);
      } catch (e) {
        console.error(e.message);
        return send(res, 502, { error: e.message });
      }
    } catch (e) {
      console.error("Unexpected error in /api/draft:", e);
      if (!res.headersSent) return send(res, 500, { error: "Something went wrong." });
      return res.end();
    }
  }

  send(res, 404, { error: "Not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`Ghostwriter running at http://localhost:${PORT}  (model: ${MODEL})`);
});
