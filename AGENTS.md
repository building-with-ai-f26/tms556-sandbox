# AGENTS.md — Coding Agent Operating Manual

> Give this file to your coding agent and check that it is using these instructions. Keep the stack, commands, and ground rules current.

## 1. Project Overview
- **Project name:** Ghostwriter
- **What this repo builds:** An AI agent that drafts and sends iMessage replies in your own style, so busy people stop leaving texts unanswered.
- **Primary user & core workflow:** [See the living PRD in `docs/index.html`]
- **Tech stack:** [e.g., Python 3.12 / FastAPI / Next.js / SQLite / OpenRouter API]

## 2. Commands
- **Install dependencies:** `[e.g., npm install / uv sync]`
- **Run locally:** `[e.g., npm run dev]`
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
