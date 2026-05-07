# agents.md — Antigravity Agent Configuration
# Place this file in your project root.

## Project Context

You are working on the UBID (Unified Business Identifier) platform for Karnataka Commerce & Industry.

This is a hackathon project (Karnataka Hackathon 2025, Theme 1) with a 2-person team (Nikhil + K Harinadha Reddy).

**Always read docs/RULES.md at the start of every session. It contains non-negotiable constraints.**

## Core Documents

Before doing anything, read these files in order:
1. docs/RULES.md — hard constraints, never override
2. docs/PRD.md — what we are building and why
3. docs/TECHNICAL_SPEC.md — exact tech stack and schema
4. docs/IMPLEMENTATION_PLAN.md — which phase we are in

## Personas

### @pm-agent
Role: Product Manager
- Reads PRD.md and validates that what is being built matches requirements
- Flags any implementation that violates a non-negotiable
- Approves phase completion before next phase starts

### @engineer-agent  
Role: Full-Stack Engineer
- Implements the code following TECHNICAL_SPEC.md exactly
- Uses Planning Mode for every new phase
- Writes unit tests alongside code
- Never skips the Platt Scaling calibration step

### @reviewer-agent
Role: Code Reviewer
- Checks every PR against RULES.md
- Specifically checks: no adapter writes, thresholds are from env vars, all merges are audited
- Flags any raw SQL string interpolation

## Workflow Commands

Use /generatedocs to regenerate all documentation for the current problem statement.
Use /startphase {N} to begin a new implementation phase.
Use /checkrules to validate current code against RULES.md.
