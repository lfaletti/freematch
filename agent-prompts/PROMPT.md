# Prompt — continue FreeMatch

Paste this (or just: _"Read agent-prompts/PROMPT.md and continue"_) to any agent or
teammate picking up the project. This file is stable — it doesn't change between sessions.

---

You're continuing the **FreeMatch** project, which is worked on in stages across sessions.

1. **Read `agent-prompts/STATE.md`** — it's the single source of truth for where things
   stand and what comes next.
2. **Do the top item under "Next up"** in STATE.md, unless the user asked for something else.
3. **Follow the guardrails** listed in STATE.md. Run `npm run check` — it must pass before
   you consider the work done.
4. **Before finishing**, update STATE.md:
   - Rewrite **Status** and **Next up** to match the new reality (replace, don't append).
   - Add **one line** to the **Log** at the bottom (newest first).
   - Bump the "Last updated" date and session number.
   Then commit with a clear message.

Keep STATE.md short — it's a handoff note, not a changelog. Detailed history belongs in
git history and `docs/SESSION_*_SUMMARY.md`, not here.
