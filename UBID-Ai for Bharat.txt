# UBID — Unified Business Identifier Platform
### Approach Document | AI for Bharat Hackathon

---

## The Problem

Today, government departments in Karnataka store business data in **completely separate systems**. A single business may have different IDs, different name spellings, and different records across:

| Department | Example Record |
|---|---|
| Factories Department | "ABC Textiles" — REG/FAC/2019/4532 |
| Labour Department | "ABC Textiles Pvt Ltd" — LAB/2020/1187 |
| Pollution Control Board (KSPCB) | "ABC Textile Ltd" — KSPCB/KA/2019/892 |
| Shop & Establishment | "A.B.C. Textiles Private Limited" — S&E/BLR/2018/667 |
| Electricity Board (BESCOM) | "ABC Textiles Factory" — BESCOM/560058/44291 |

**These are all the same business** — but no system knows that.

### What This Causes

- **Fragmented identity** — The same business appears 3–5 times across departments with no link between them.
- **No single source of truth** — No one can answer "How many unique businesses exist in Karnataka?"
- **Blind spots on activity** — Government cannot tell which businesses are active, dormant, or have silently shut down.
- **Compliance gaps** — A factory that hasn't been inspected in 3 years is invisible because its records are scattered.
- **Wasted effort** — Officers manually cross-reference systems, taking days for what should take seconds.

> **The core issue is not bad data — it's disconnected data.**

---

## Our Solution

We propose the **Unified Business Identifier (UBID)** system — giving **one unique digital identity** to every business across all government departments.

Our solution has two parts that work together:

### Part 1: UBID Creation — Entity Resolution Engine

We use **AI-powered matching** to identify records belonging to the same business and link them under one UBID.

```
Factory Dept  → "ABC Textiles"            ─┐
Labour Dept   → "ABC Textiles Pvt Ltd"     ├── Same business → UBID: KA-PAN-01635952
Pollution Dept → "ABC Textile Ltd"         ─┘
```

**How the matching works (4 layers):**

| Layer | What It Does | Technology |
|---|---|---|
| 1. Exact ID Match | Finds businesses sharing the same PAN or GSTIN | Database index lookup |
| 2. Name Similarity | Catches spelling variations, abbreviations, legal suffixes | Jaro-Winkler + Fuzzy matching |
| 3. Address Match | Matches businesses at the same physical location | PIN code + locality normalisation |
| 4. ML Scoring | Handles ambiguous cases where rules fail | XGBoost classifier with 9 features |

Each match gets a **confidence score (0–100%)**:
- **≥ 88%** → Auto-linked instantly (no human needed)
- **55–87%** → Sent to human reviewer for final decision
- **< 55%** → Kept as separate businesses

### Part 2: Active Business Intelligence

After linking businesses, we **continuously analyse activity** across departments:

**Events we monitor:**
- Licence renewals
- Factory inspections
- Compliance filings
- Pollution clearance submissions
- Electricity consumption patterns

**Classification output:**

| Status | What It Means | Example Signal |
|---|---|---|
| 🟢 **Active** | Business is operating normally | Renewed licence 45 days ago |
| 🟡 **Dormant** | No recent activity, possibly idle | Last event was 14 months ago |
| 🔴 **Closed** | Closure notice filed or abandoned | Filed dissolution with Registrar |

> **Result: Government gets a live, real-time view of every business — not just a static database.**

---

## What Makes Our Approach Unique

### 1. Intelligence, Not Just Data Cleaning

Most entity resolution systems stop at removing duplicates. **We go further:**

- ✅ Creates a unified business identity
- ✅ Classifies whether each business is Active, Dormant, or Closed
- ✅ Explains *why* each classification was made, in plain English

This transforms scattered records into **actionable intelligence**.

### 2. Natural Language Queries — Talk to Your Data Like a Human

Our system includes a **natural language query interface** where government officers can ask questions the way they'd ask a colleague:

> *"Show me all active factories in Bangalore North with no inspection in the last 18 months"*

> *"Which businesses in PIN 560058 have both KSPCB and Factory registrations but no Labour filing?"*

> *"How many dormant businesses renewed their licence last year?"*

The system **translates natural language into structured cross-department queries**, pulling results from linked UBID records across all departments simultaneously. No SQL knowledge needed. No switching between 5 different department portals.

**This is the first system that lets government officers query across all departments in one sentence.**

### 3. Live AI Thinking — Transparent, Explainable Decisions

Every decision the AI makes is **visible and explainable in real-time**:

**For Entity Resolution:**
The system shows exactly *why* two records were matched or separated using **SHAP (SHapley Additive exPlanations)**:

```
Match Decision: ABC Textiles ↔ ABC Textiles Pvt Ltd
Confidence: 87.4%

Contributing Factors:
  ✦ PAN number match           → +0.35 (strongest signal)
  ✦ Name similarity (92%)      → +0.28
  ✦ Same PIN code              → +0.19
  ✦ Phone number mismatch      → -0.08 (works against match)
  ✦ Different registration year → -0.04
```

**For Activity Classification:**
Officers see exactly *why* a business was classified as Dormant:

```
Classification: DORMANT (Confidence: 78%)

Reasoning:
  • No inspection events in 14 months (+0.42)
  • Last licence renewal was 380 days ago (+0.31)
  • Zero compliance filings in observation window (+0.18)
  • Electricity readings still active (-0.12)
  
⚠ Note: Active electricity suggests business may still 
  operate — recommend physical verification.
```

**This level of transparency is critical for government use** — every decision can be audited, questioned, and reversed.

### 4. Zero Changes to Existing Government Systems

Our solution **sits on top of current systems** as a read-only layer:

| Aspect | Our Approach |
|---|---|
| Data access | Read-only adapters pull data; nothing is written back |
| Migration | None required — works with existing databases as-is |
| Integration | One adapter per department, plugged in independently |
| Risk | Zero risk of breaking existing workflows |
| Deployment | Can be deployed for one department and expanded gradually |

> **No migration. No replacing old systems. No downtime. Lowest possible risk.**

### 5. Human + AI Working Together (Human-in-the-Loop)

AI doesn't make final decisions alone. The system follows a **triage model**:

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│  AI Suggests │ ──→ │  Human Reviews   │ ──→ │ Decision Logged│
│  Match: 74%  │     │  Approve/Reject  │     │ Full Audit Trail│
└──────────────┘     └──────────────────┘     └────────────────┘
```

- **AI suggests** matches with confidence scores and explanations
- **Human reviewers** approve, reject, defer, or escalate
- **Every decision is logged** with reviewer ID, timestamp, and reasoning
- **Any decision can be reversed** — no merge is permanent

This makes the system:
- ✅ **Explainable** — every match has a reason
- ✅ **Auditable** — complete trail for compliance
- ✅ **Reversible** — wrong merges can be undone
- ✅ **Accountable** — reviewer identity is always recorded

### 6. Self-Improving System

Most matching systems use **fixed rules** that degrade over time. Our system **learns and improves continuously**:

| Mechanism | What Happens | When It Triggers |
|---|---|---|
| **Rule Refinement** | New name normalisation rules are generated from reviewer corrections | When a new mismatch pattern is confirmed |
| **Threshold Tuning** | Auto-link/review confidence bands adjust to match real-world accuracy | When reviewers consistently approve/reject at certain bands |
| **Weight Adjustment** | Individual matching signals (PAN, name, address) are re-weighted based on reliability | When one signal consistently outperforms others |
| **Model Retraining** | XGBoost classifier is retrained on accumulated reviewer decisions | Every 500+ confirmed decisions |
| **Validation** | New model runs in shadow mode alongside old model before deployment | Every retraining cycle |

> **The system gets smarter with every reviewer decision. It doesn't just store data — it learns from it.**

---

## Key Differentiators — At a Glance

| Differentiator | What It Means |
|---|---|
| 🆔 **Unified Business ID** | One identifier across all departments |
| 📊 **Activity Intelligence** | Live Active / Dormant / Closed classification |
| 💬 **Natural Language Queries** | Ask questions in plain English, get cross-department answers |
| 🧠 **Live AI Thinking** | See exactly why every decision was made, in real-time |
| 🤝 **Human-in-the-Loop** | AI suggests, humans decide, system learns |
| 🔍 **Explainable Decisions** | SHAP-powered transparency on every match and classification |
| 🔄 **Self-Improving** | Gets more accurate with every reviewer interaction |
| 🏛️ **Zero System Changes** | Read-only layer on top of existing infrastructure |
| 🛡️ **Full Audit Trail** | Every decision traceable, reversible, and compliant |

---

## Impact

With UBID deployed, government can answer questions it **has never been able to answer before**:

| Question | Before UBID | After UBID |
|---|---|---|
| How many unique businesses exist in Karnataka? | Unknown — only per-department counts exist | **Exact count with cross-department deduplication** |
| Which businesses are inactive? | Manual survey, months of effort | **Real-time classification, updated daily** |
| Which factories need compliance checks? | Cross-reference 5 systems manually | **One query: "Active factories with no inspection in 18 months"** |
| Which businesses operate across many departments? | Impossible to determine | **Instant lookup by UBID — see all linked departments** |
| Is this business the same as that one? | Phone calls between departments | **AI confidence score with SHAP explanation in milliseconds** |

### Scale for Karnataka

- **40+ departments** can be connected through adapters
- **New departments added** by plugging in one adapter — no core system changes
- **Smart blocking** reduces millions of record comparisons to only the most likely matches
- **District, sector, and compliance queries** become answerable for the first time

---

## One-Line Summary

> **UBID creates one identity for every business and turns scattered government records into a single intelligent, queryable, self-improving system — where officers can ask questions in plain English and get explainable, auditable answers in seconds.**

---

## Technical Implementation

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 16, React 19, Recharts | Dashboard, Reviewer UI, Analytics |
| Backend | FastAPI, Python 3.11 | REST API, ML Pipeline |
| ML (Matching) | XGBoost + Platt Scaling + SHAP | Entity resolution + explainability |
| ML (Classification) | XGBoost multi-class + SHAP | Activity classification |
| Text Matching | RapidFuzz, Jellyfish | Fuzzy name + phonetic matching |
| Database | PostgreSQL 15, SQLAlchemy | Structured data storage |
| Infrastructure | Docker, Vercel, Render | Cloud deployment |

**Repository**: [github.com/harir03/aiforbharat](https://github.com/harir03/aiforbharat)

---

*AI for Bharat — Building intelligent infrastructure for Digital India*
