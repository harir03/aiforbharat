# Workflow: /generatedocs
# Place this file in .agent/workflows/generatedocs.md
# Trigger: type /generatedocs in Antigravity chat

## Purpose
Automatically generate all required project documentation for the current problem statement being worked on.

## Trigger
User types: `/generatedocs`

## Steps

### Step 1 — Read Current Context
Read the following to understand what we are building:
- Any problem statement or brief the user has shared in the current session
- agents.md to understand the project type
- Any existing docs/ files already present

### Step 2 — Generate All Documents
Create or overwrite the following files in the docs/ directory:

**docs/PRD.md** — Product Requirements Document
Structure:
- Problem Statement (plain English, no jargon)
- Users table (who uses it, what they need)
- Core Features list (every feature with acceptance criteria)
- Non-Negotiables (hard constraints that cannot be violated)
- Success Metrics (measurable targets)
- Out of Scope

**docs/TECHNICAL_SPEC.md** — Technical Specification
Structure:
- Stack table (technology, version, justification)
- Project folder structure (exact file tree)
- Database schema (full SQL CREATE statements)
- API endpoints (all routes with method, path, description)
- Key algorithms (pseudocode for the hard parts)
- Environment variables (all .env keys with descriptions)
- What NOT to do (explicit prohibitions)

**docs/PROMPTS_SPEC.md** — AI Prompts Specification
Structure:
- One numbered PROMPT section per implementation phase
- Each prompt is self-contained (reads required files, states exact tasks, defines done criteria)
- Prompts are ordered by dependency (Phase N must complete before Phase N+1)
- Each prompt ends with: "Stop here. Wait for my approval before continuing."

**docs/IMPLEMENTATION_PLAN.md** — Phase-by-Phase Build Plan
Structure:
- Phase 0: Setup/scaffolding
- Phase 1 through N: One phase per major feature area
- Each phase has: goal, task checklist, done criteria
- Demo script at the end
- Risk table

**docs/RULES.md** — Agent Constitution
Structure:
- Tech stack rules (locked-in choices)
- Data integrity rules (non-negotiables from problem statement)
- Code quality rules
- Step-by-step workflow rules
- UI rules
- Definition of done
- Conflict resolution (what to do when docs disagree)

### Step 3 — Announce Completion
After all files are written, output:

```
✅ Documentation generated:
├── docs/PRD.md
├── docs/TECHNICAL_SPEC.md  
├── docs/PROMPTS_SPEC.md
├── docs/IMPLEMENTATION_PLAN.md
└── docs/RULES.md

Next step: Review each file, then use PROMPT 1 from PROMPTS_SPEC.md to start building.
```

## Rules for This Workflow

- Generate ALL five documents every time. Never skip one.
- Make each document specific to the CURRENT problem statement. Do not copy-paste generic templates.
- If any information is missing from the problem statement to fill a section, write [TO BE DEFINED] and flag it.
- Documents must be consistent with each other. If PRD says PostgreSQL, TECHNICAL_SPEC must also say PostgreSQL.
- RULES.md must always include the non-negotiables from the problem statement verbatim.
