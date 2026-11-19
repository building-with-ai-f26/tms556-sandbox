# AGENTS.md — Coding Agent Operating Manual

> Give this file to your coding agent and check that it is using these instructions. Keep the stack, commands, and ground rules current.

## 1. Project Overview
- **Project name:** Ghostwriter
- **What this repo builds:** An AI agent that drafts and sends iMessage replies in your own style, so busy people stop leaving texts unanswered.
- **Primary user & core workflow:** [See the living PRD in `docs/index.html`]
- **Tech stack:** Node v26 (built-in http and fetch, no packages) / plain HTML + JavaScript / OpenRouter API (Claude Haiku 5.5) / PostHog / GitHub Pages for docs/

## 2. Commands
- **Install dependencies:** None. Needs Node v26; no `npm install` (see Setup below).
- **Run locally:** `node --env-file=.env app/server.js`, then open http://localhost:3000 (see Run below).
- **Run deterministic tests:** `[e.g., pytest / npm test]`
- **Run model evals:** `[e.g., python tests/eval.py]`

## 3. Non-Negotiable Engineering Rules
1. **Plan before coding:** Before touching multiple files, propose a brief plan and wait for approval.
2. **Small batches:** Make small, focused changes that can be reviewed and explained by a human in a single Pull Request. After each working step, propose a clear commit message; the human decides when to commit.
3. **Explainability:** Avoid unnecessary abstractions or dependencies. Help the human builder understand the main components, what changed, why it matters, what could break, and how it was checked.
4. **Verify changes:** Run relevant checks. For a reproducible logic bug, use a failing test to demonstrate the fix when practical. Record manual checks and known limitations; follow the selected Build 4 evaluation track. Before saying "done", run the app and tell the human how the change was verified.
5. **Zero secrets in code:** Never hardcode API keys, tokens, or credentials. Always read from environment variables (`.env`) and update `.env.example` when new variables are needed. Never commit secrets; keys live only in `.env`, which is listed in `.gitignore`.
6. **Stop when looping:** If a fix fails twice in a row, stop, summarize what failed, and ask the human before trying a third approach.
7. **Keep the Product Page current:** Keep `docs/index.html` (Product Page = living PRD + build log) up to date as the product, scope, or evidence changes.
8. **Slice big tasks:** If a task gets big or confusing, stop and propose a smaller slice before continuing.
9. **Weekly build log:** Each weekly build is due Monday at noon (New York time). Add a build-log entry to `docs/index.html` covering what shipped, what broke, what it cost (tokens / API / hosting), what was learned, hours spent, and what's next.
10. **Verify on the live URL (learned Nov 19):** Anything that depends on proxies, headers or the host must be verified on the live URL (https://tms556-sandbox.onrender.com) after deploying, because a local test is not proof. *Why:* the agent's first rate-limit fix used the last `X-Forwarded-For` address. It passed local tests, then failed on the live site because Render's proxy appends its own IP to that header.

## 4. Project Structure
- `app/server.js`: **backend.** A small Node server on your laptop (localhost:3000). It serves `app/index.html`, reads `OPENROUTER_API_KEY` from `.env`, and calls OpenRouter (Claude Haiku 5.5) to draft a reply. It is the only code that sees the key.
- `app/index.html`: **browser.** The Build 2 page: paste a text from Carly and 3 of your own texts, and it asks the backend (`/api/draft`) for a draft. PostHog runs here.
- `prototype/`: **browser.** The Build 1 rule-based prototype (no AI, no backend). `docs/prototype/` is the copy that GitHub Pages serves.
- `docs/`: **browser.** The Product Page (`docs/index.html`: living PRD + build log) and its images, published with GitHub Pages. PostHog runs here.
- `.env`: your real secrets (`OPENROUTER_API_KEY`), read only by the backend. Never committed.
- `.env.example`: a template showing which variables `.env` needs, with no real values. Safe to commit.

## 5. Setup
1. Install Node v26 (check with `node --version`). No `npm install` is needed: there are no packages.
2. Copy the template: `cp .env.example .env`
3. Open `.env` and set `OPENROUTER_API_KEY` to your OpenRouter key.
4. `.env` is in `.gitignore` and must never be committed.

## 6. Run
1. From the repo root: `node --env-file=.env app/server.js`
2. Open http://localhost:3000
3. Press Ctrl+C in the terminal to stop the server.

## Shipping
How a change goes live on Render:
1. **Run it locally:** `node --env-file=.env app/server.js`, open http://localhost:3000, and test a real draft.
2. **Hand off to the human:** tell them which files changed and propose a commit message. The human commits and pushes; the agent does not.
3. **Deploy (human):** after pushing, the human clicks **Manual Deploy → Deploy latest commit** in Render. The service is connected as a public repo and does **not** auto-deploy, so a push alone changes nothing live.
4. **Check the live site:** open https://tms556-sandbox.onrender.com and check that the change is there.
5. **Rerun the live security test:**
   - The key search returns 0: no `sk-`, `sk-or`, `service_role` or `sb_secret_` in the live site.
   - 12 requests to `/api/draft` with faked headers (`X-Forwarded-For`, `True-Client-IP`) switch to **429 after 10**. Use invalid bodies so no OpenRouter credit is spent.
6. **Report:** tell the human what is live and what was checked.

**Render settings:**
- Build command: `npm install`
- Start command: `npm start`
- `OPENROUTER_API_KEY` is set **only** in Render's dashboard (Environment), never in the repo.

## Ask me first
Do not do these without the human's explicit OK:
- Deleting data or changing the database.
- Keys, secrets and permissions, including `.env` and Render settings.
- Anything that costs money.
- Commits and pushes.
