# Skill: apply-tailadmin-ui
# Mention: @apply-tailadmin-ui
# Purpose: Instead of writing dashboard UI from scratch, clone and adapt TailAdmin
# as the base UI layer for the UBID platform frontend.

## What This Skill Does

When invoked, this skill:
1. Clones the TailAdmin Next.js template into the frontend/ directory
2. Strips out all demo/placeholder pages
3. Adapts the layout and components for the UBID platform's three pages:
   - /dashboard — UBID search and analytics
   - /reviewer — Human reviewer queue
   - /analytics — Cross-department query interface

## Rules of Engagement

- Never build UI components from scratch that TailAdmin already provides. Check TailAdmin's component library first.
- Never change the core layout (sidebar, header, footer) — only change the content area.
- Never add MUI, Bootstrap, or Ant Design — Tailwind only.
- Always preserve TypeScript — no .js files in the frontend.
- Save final output to frontend/ in the project root.
- Approval Gate: After adapting each page, pause and show a component tree. Wait for user approval before moving to the next page.

## Step 1 — Clone TailAdmin

```bash
git clone https://github.com/TailAdmin/free-nextjs-admin-dashboard.git frontend-template
cp -r frontend-template/src frontend/
cp frontend-template/package.json frontend/package.json
cp frontend-template/tailwind.config.ts frontend/tailwind.config.ts
cp frontend-template/tsconfig.json frontend/tsconfig.json
rm -rf frontend-template
```

## Step 2 — Clean Up Demo Pages

Remove all demo pages not needed for UBID:
- Delete: src/app/calendar/, src/app/profile/, src/app/forms/, src/app/tables/
- Delete: src/app/chart/, src/app/ui-elements/
- Keep: src/components/Charts/, src/components/Tables/, src/components/Cards/
- Keep: src/components/Sidebar/, src/components/Header/
- Keep: src/layout/DefaultLayout.tsx

## Step 3 — Adapt the Sidebar

Replace default nav items in src/components/Sidebar/index.tsx with exactly three:
1. "UBID Lookup" → /dashboard (search icon)
2. "Reviewer Queue" → /reviewer (clipboard icon) + badge showing queue count
3. "Analytics" → /analytics (chart icon)

Replace TailAdmin logo text with "UBID Platform" and sub-text "Karnataka Commerce & Industry".

## Step 4 — Dashboard Page (/dashboard)

File: src/app/dashboard/page.tsx

Top: 4 stat cards using TailAdmin's CardDataStats component:
- Total UBIDs (GET /api/analytics/summary → total_ubids)
- Active Businesses (→ active_count)
- Dormant Businesses (→ dormant_count)
- Pending Review (→ review_queue_count)

Below: Search bar (plain Tailwind input) → on submit: GET /api/ubid/search?q={name}&pin={pin}

Results table columns: UBID | Business Name | Departments | Status | Last Activity | Action
Status badge colours: Active=green pill, Dormant=amber pill, Closed=red pill, Pending=gray pill

## Step 5 — Reviewer Page (/reviewer)

File: src/app/reviewer/page.tsx

Two-column layout (60/40 split):

LEFT — Record Comparison Panel:
- Two side-by-side cards: Record A | Record B
- Fields: Name (raw), Name (normalised), Address, PIN, PAN, GSTIN, Phone, Dept
- Fields that differ: highlight amber background (bg-amber-50 border-amber-300)
- Confidence score badge at top

RIGHT — Evidence Panel:
- SHAP bar chart using Recharts (horizontal BarChart)
  - Y-axis: feature names
  - X-axis: SHAP value
  - Green bars = drives match, Red bars = drives separation
- Plain English explanation text below chart

BOTTOM — Action Row (full width):
- [Approve Merge] green | [Reject] red | [Defer] gray | [Escalate] orange
- Reject and Escalate show a required text input for reason
- After any action: auto-load next case from queue

TOP — Queue Status Bar:
- "X cases in queue" count
- Warning banner if any case > 72 hours: "3 cases waiting over 72 hours"

## Step 6 — Analytics Page (/analytics)

File: src/app/analytics/page.tsx

Section 1 — UBID Search:
- Search bar: accepts UBID / PAN / GSTIN / name+PIN
- Result card: UBID code (monospace), anchor type badge, status badge, linked departments

Section 2 — Event Timeline:
- Vertical timeline showing last 12 events
- Colour-coded by department: Factories=blue, KSPCB=green, Labour=orange, Shop Est=purple

Section 3 — Classification Explanation:
- "Why is this business Active?" card
- SHAP explanation as plain English bullets
- Confidence progress bar

Section 4 — Query Builder:
- Filter dropdowns: Status | Department | PIN Code | Days Since Last Event
- "Run Query" button → POST /api/analytics/query
- Paginated results table

## Step 7 — Colour Override

Edit tailwind.config.ts to add UBID teal palette:

```typescript
colors: {
  primary: {
    DEFAULT: "#2E6D7A",
    dark: "#1E4D58",
    light: "#D4EEF2",
  },
  status: {
    active: "#065F46",
    activeBg: "#D1FAE5",
    dormant: "#92400E",
    dormantBg: "#FEF3C7",
    closed: "#991B1B",
    closedBg: "#FEE2E2",
  }
}
```

Replace all blue-600 references in Sidebar and Header with primary.DEFAULT (#2E6D7A).

## Completion Checklist

- [ ] TailAdmin cloned and demo pages removed
- [ ] Sidebar shows 3 nav items with correct routes and UBID branding
- [ ] /dashboard: 4 stat cards + search + results table live from API
- [ ] /reviewer: side-by-side records + amber diffs + SHAP chart + 4 actions working
- [ ] /analytics: UBID detail + event timeline + query builder working
- [ ] Teal colour palette applied throughout
- [ ] All API calls use NEXT_PUBLIC_API_URL env variable
- [ ] No hardcoded data anywhere
- [ ] No TypeScript errors
