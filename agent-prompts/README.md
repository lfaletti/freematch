# agent-prompts — staged handoff system

Lets work on FreeMatch continue across sessions without losing context. Just two files:

- **`PROMPT.md`** — the stable instruction. Paste it (or _"Read agent-prompts/PROMPT.md and
  continue"_) to any agent or teammate picking up the project. It never changes.
- **`STATE.md`** — the living handoff: current status, what's next, guardrails, and a
  one-line-per-session log. Each session **rewrites** Status + Next up and **appends** one
  log line.

That's the whole system. Detailed history lives in git and `docs/SESSION_*_SUMMARY.md`, so
STATE.md stays short and never accretes cruft.

## Why this shape
The previous version split the prompt across five files that duplicated each other and the
session docs, and the "next steps" file was append-only so it grew to hundreds of lines of
stale, contradictory paths. Separating the **stable prompt** (PROMPT.md) from the **mutable
state** (STATE.md), and keeping history in git instead of in the prompt, keeps it honest and
easy to maintain.
