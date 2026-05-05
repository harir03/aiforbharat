# RULES.md — Agent Constitution for UBID Platform
**Antigravity must read this file before every session. These rules are non-negotiable.**

---

## 1. Tech Stack Rules (Never Override These)

- Backend: FastAPI + Python 3.11 ONLY. No Flask, no Django.
- Database: PostgreSQL 15 ONLY. No SQLite, no MongoDB for primary storage.
- ML: XGBoost + SHAP ONLY for scoring and classification. No sklearn RandomForest, no neural nets.
- String matching: RapidFuzz ONLY. No fuzzywuzzy (deprecated).
- Frontend: React 18 + Next.js 14 + Tailwind CSS. No plain HTML files, no Vue, no Angular.
- Charts: Recharts ONLY. No Chart.js, no D3 directly in components.
- Containerisation: Docker + Docker Compose. Every service must have a docker-compose entry.

---

## 2. Data Integrity Rules (Core Non-Negotiables from Problem Statement)

- **NEVER write to any department system adapter.** All adapters are READ-ONLY. If you write a method that writes to Shop Establishment, Factories, Labour, or KSPCB — that is a critical violation.
- **NEVER auto-link records with confidence below 0.88.** The threshold is 0.88. Not 0.80, not 0.85. Exactly 0.88.
- **NEVER silently drop an activity event.** If attribution fails, the event goes to the pending queue or manual review. It must always be traceable.
- **NEVER call an external hosted LLM API (OpenAI, Gemini Cloud, Anthropic API) on raw record data.** Local models only if needed.
- **NEVER merge two records without logging to linkage_audit.** Every merge must produce an audit row.

---

## 3. Code Quality Rules

- Every function must have a type signature (input and output types).
- Every database operation must be inside a try/except with proper error logging.
- No hardcoded threshold values in business logic code — always read from environment variables.
- No print() statements — use Python logging module.
- Every API endpoint must return structured JSON. No plain text responses.
- All SQL must use parameterised queries (SQLAlchemy ORM). No raw string interpolation in SQL.

---

## 4. Step-by-Step Rules (How to Work With the Prompts)

- **Always use Planning Mode** before implementing any phase.
- **Produce an Implementation Plan artifact** at the start of each phase. Wait for approval before writing code.
- **One phase at a time.** Never jump from Phase 1 to Phase 3.
- **If a phase prompt is ambiguous**, check docs/PRD.md and docs/TECHNICAL_SPEC.md first before asking.
- **After completing a phase**, run available tests before declaring done.

---

## 5. UI Rules

- Reviewer UI must show BOTH raw and normalised field values. Not just one.
- Fields that differ between two candidate records must be visually highlighted (amber/yellow background).
- SHAP chart must always render as a horizontal bar chart with feature names on Y axis.
- Status badges: Active = green, Dormant = amber, Closed = red. No other colours for status.
- Queue age warning must appear if any case is older than 72 hours.
- Loading states must be shown for all async operations. No blank screens.

---

## 6. What "Done" Means for Each Phase

A phase is only done when:
1. All checklist items in IMPLEMENTATION_PLAN.md for that phase are checked
2. The defined acceptance criteria passes
3. No TypeErrors, no unhandled promise rejections, no Python exceptions in server logs
4. docker-compose up -d still works after the changes

---

## 7. If You Are Uncertain

If the PRD and the TECHNICAL_SPEC conflict → follow the TECHNICAL_SPEC (more specific).
If both are silent on something → ask before implementing. Do not guess on data model decisions.
If a library version causes issues → note it in a comment and use the nearest working alternative from the same library family.
