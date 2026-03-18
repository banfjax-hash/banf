# BANF Financial Reporting Agent — Pipeline Plan

## Current State Assessment

### What Exists (Backend)
| Layer | Asset | Status |
|---|---|---|
| **Wix Collections** | `FinancialEntries` (income/expense ledger) | Created, seeded 2020–2025 |
| | `Vendors` (22+ vendors, 15 categories) | Created, seeded |
| | `ReconciliationReports` (per-year reports) | Created |
| | `FinancialLedger` (v1.0 credit/debit model) | **Duplicate — RETIRE** |
| | `ReimbursementTickets` | Created |
| | `Payments`, `CRMMembers` | Created |
| **API Endpoints** | `/ledger` GET — list entries by year/type/category | Deployed |
| | `/ledger_entry_create` POST — add ledger line item | Deployed |
| | `/ledger_entry_update` POST — update entry | Deployed |
| | `/ledger_years` GET — year summaries | Deployed |
| | `/reconcile` POST — run reconciliation for 1 year | Deployed |
| | `/reconciliation_report` GET — full year report | Deployed |
| | `/reconciliation_summary` GET — all-years overview | Deployed |
| | `/vendors` GET, `/vendor_create` POST, `/vendor_update` POST | Deployed |
| | `/vendor_categories` GET — income/expense category lists | Deployed |
| **Income Categories** | membership, event_ticket, sponsorship, donation, advertisement, other_income | Defined |
| **Expense Categories** | venue, catering, decoration, photography, printing, sound_music, apparel, prasad, admin, bank_fee, transport, other_expense | Defined |

### What Exists (Frontend)
| Portal | Section | Status |
|---|---|---|
| **Admin Portal** | Procurement panel | LIVE |
| | Reimbursement panel | LIVE |
| | **Ledger/Finance report panel** | **MISSING** |
| | **Vendor management panel** | **MISSING** |
| | **Reconciliation dashboard** | **MISSING** |
| **Member Portal** | Budget Reports | **"Coming Soon" stub** |

### Critical Gaps
1. **No UI for the 16+ finance API endpoints** — ledger, vendors, reconciliation are API-only
2. **No date-range filtering** in any UI — no "last week / last month / last quarter / last year"
3. **No membership income vs. sponsor income breakdown** surfaced anywhere
4. **No event-wise expense breakdown** panel
5. **No reporting agent** that continuously validates data integrity
6. **Duplicate ledger collections** (`FinancialEntries` vs `FinancialLedger`) need consolidation

---

## Architecture: Reporting Agent Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    BANF FINANCIAL REPORTING                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│  │ Data Sources │──▶│ Ingestion    │──▶│ Wix Collections     │  │
│  │             │   │ Agents       │   │ (Source of Truth)    │  │
│  │ • WF Bank   │   │             │   │                     │  │
│  │ • Zelle     │   │ • bank-sync  │   │ • FinancialEntries  │  │
│  │ • PayPal    │   │ • zelle-sync │   │ • Vendors           │  │
│  │ • Facilitron│   │ • manual-add │   │ • CRMMembers        │  │
│  │ • Manual    │   │             │   │ • Payments           │  │
│  └─────────────┘   └──────────────┘   └──────────┬──────────┘  │
│                                                   │             │
│                    ┌──────────────────────────────┘             │
│                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              REPORTING AGENT (Node.js)                   │   │
│  │                                                         │   │
│  │  1. Reconciliation Engine                               │   │
│  │     • Cross-check bank ↔ ledger ↔ CRM                  │   │
│  │     • Flag mismatches, orphaned entries                  │   │
│  │     • Auto-categorize uncategorized entries              │   │
│  │                                                         │   │
│  │  2. Report Generator                                    │   │
│  │     • Income/Expense by date range                      │   │
│  │     • Membership income YTD                             │   │
│  │     • Sponsorship income YTD                            │   │
│  │     • Event-wise expense breakdown                      │   │
│  │     • Writes JSON snapshots → cached reports            │   │
│  │                                                         │   │
│  │  3. Data Integrity Validator                            │   │
│  │     • Ensure every entry has: date, amount, category    │   │
│  │     • Ensure membership payments ↔ CRMMembers match     │   │
│  │     • Ensure sponsor payments ↔ Vendors match           │   │
│  │     • Detect duplicates                                 │   │
│  │                                                         │   │
│  │  4. Alert Engine                                        │   │
│  │     • Unreconciled entries > 7 days                     │   │
│  │     • Monthly close-out reminders                       │   │
│  │     • Budget threshold warnings                         │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                       │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              FRONTEND (Admin + Member Portals)           │   │
│  │                                                         │   │
│  │  Admin Portal:                                          │   │
│  │    • Financial Ledger panel (CRUD + date-range filter)  │   │
│  │    • Income Summary panel (membership / sponsor / other)│   │
│  │    • Event Expense Breakdown panel                      │   │
│  │    • Reconciliation Dashboard                           │   │
│  │    • Vendor Management panel                            │   │
│  │                                                         │   │
│  │  Member Portal:                                         │   │
│  │    • Budget Reports (read-only annual summaries)        │   │
│  │    • Event cost transparency                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan — 7 Phases

### Phase 1: Financial Ledger Panel (Admin Portal)
**Goal:** Wire the existing `/ledger` API into a new admin portal panel with date-range filtering.

**Files to create/modify:**
- `docs/admin-portal.html` — Add sidebar item + panel section

**Panel Features:**
- Date range selector: preset buttons (Last 7 days, Last Month, Last Quarter, YTD, Last Year, Custom)
- Filter by: type (income/expense/all), category dropdown
- Sortable table: Date | Description | Category | Type | Amount | Reconciled | Event
- Running totals: Total Income, Total Expense, Net
- Export to CSV button (client-side)

**API Calls:**
```
GET /ledger?year=2026&type=income&category=membership
GET /ledger?year=2026  (all entries, client-side date filter)
GET /ledger_years  (year picker)
```

**Date Range Logic (client-side):**
```javascript
const PRESETS = {
  'last-7d':      () => [daysAgo(7), today()],
  'last-month':   () => [startOfMonth(monthsAgo(1)), endOfMonth(monthsAgo(1))],
  'this-month':   () => [startOfMonth(today()), today()],
  'last-quarter': () => [startOfQuarter(quartersAgo(1)), endOfQuarter(quartersAgo(1))],
  'this-quarter': () => [startOfQuarter(today()), today()],
  'ytd':          () => [startOfYear(today()), today()],
  'last-year':    () => [startOfYear(yearsAgo(1)), endOfYear(yearsAgo(1))],
  'custom':       () => [userStart, userEnd]
};
```

**Deliverables:**
- [ ] Add `ledger-report` sidebar item under Finance group
- [ ] Add `ledger-report` panel section with filter bar + table + KPIs
- [ ] Add `ADMIN_ACTIVE_PANELS` entry for `ledger-report`
- [ ] Wire API calls with loading states and error handling

---

### Phase 2: Income Summary Panel (Admin Portal)
**Goal:** Dedicated view showing membership income, sponsorship income, and other income for the selected year.

**Panel Features:**
- Year selector (populated from `/ledger_years`)
- 4 KPI cards: Membership Income | Sponsorship Income | Event Ticket Income | Other Income
- Bar chart (Chart.js or pure CSS bars) — monthly breakdown
- Table: all income entries for the year, grouped by category
- Comparison: this year vs. last year (% change)

**API Calls:**
```
GET /ledger?year=2026&type=income
GET /ledger?year=2025&type=income  (for comparison)
```

**Deliverables:**
- [ ] Add `income-summary` sidebar item under Finance
- [ ] KPI computation from ledger entries (filter by category === 'membership' / 'sponsorship')
- [ ] Monthly income bar chart
- [ ] Year-over-year comparison row

---

### Phase 3: Event Expense Breakdown Panel (Admin Portal)
**Goal:** Show expenses grouped by event, with per-category drilldown.

**Panel Features:**
- Year selector
- Grouped display: each event shows total expense + breakdown by category (venue, catering, decoration, etc.)
- Visual: stacked bar per event showing category proportions
- KPI cards: Total Events | Total Expense | Avg Cost/Event | Highest Cost Event
- Table: Event | Venue | Catering | Decoration | Photo | Sound | Other | **Total**

**Data Model:**
Each `FinancialEntries` record has an `eventName` field. Group by `eventName` where `type === 'expense'`.

**Expected Events (2025-2026):**
- Durga Puja 2025
- Spandan 2025 (cultural event)
- Sports Day 2025
- Saraswati Puja 2026
- Holi 2026
- Annual Picnic 2026

**Deliverables:**
- [ ] Add `event-expenses` sidebar item under Finance
- [ ] Event-grouped expense table with category columns
- [ ] Per-event stacked bar visualization
- [ ] KPI cards for cost analysis

---

### Phase 4: Reporting Agent Script (`banf-finance-reporting-agent.js`)
**Goal:** Node.js agent that pulls data from Wix APIs, validates integrity, generates report snapshots, and flags issues.

**Agent Responsibilities:**

#### 4A. Data Integrity Validator
```javascript
// Runs on-demand or scheduled
async function validateDataIntegrity() {
  // 1. Every FinancialEntries record must have: entryDate, amount > 0, type, category
  // 2. Every 'membership' income entry should have a matching CRMMembers record
  // 3. Every 'sponsorship' income entry should have a matching Vendors record
  // 4. No duplicate entries (same date + amount + description + category)
  // 5. All entries must be in a valid year (2020-2026)
  // 6. Reconciled entries must have reconciliation evidence
}
```

#### 4B. Report Snapshot Generator
```javascript
// Generates JSON report files for quick portal loading
async function generateReportSnapshot(year) {
  return {
    generatedAt: new Date().toISOString(),
    year,
    income: {
      membership: { total, count, entries },
      sponsorship: { total, count, entries },
      eventTicket: { total, count, entries },
      donation: { total, count, entries },
      other: { total, count, entries }
    },
    expense: {
      byCategory: { venue, catering, decoration, ... },
      byEvent: { 'Durga Puja 2025': { total, breakdown }, ... },
      byMonth: [ { month: 'Jan', total }, ... ]
    },
    reconciliation: { reconciled, unreconciled, percentage },
    alerts: [ { type, message, severity, entryId } ]
  };
}
```

#### 4C. Reconciliation Cross-Check
```javascript
async function crossCheckReconciliation(year) {
  // 1. Pull bank statements (Wells Fargo ledger scan data)
  // 2. Pull Zelle transaction history
  // 3. Match against FinancialEntries by date + amount
  // 4. Flag unmatched bank transactions (money in/out with no ledger entry)
  // 5. Flag ledger entries with no bank evidence
  // 6. Generate reconciliation report
}
```

**Deliverables:**
- [ ] Create `banf-finance-reporting-agent.js`
- [ ] Data integrity validation with detailed error report
- [ ] Report snapshot generation (writes to `_finance-report-cache/`)
- [ ] Cross-check reconciliation logic
- [ ] Summary output (console + JSON file)

---

### Phase 5: New Wix API Endpoints for Aggregated Reports
**Goal:** Add server-side aggregation endpoints so the portal doesn't need to pull all raw entries.

**New Endpoints:**
```
GET /finance_income_summary?year=2026
  → { membership: 12500, sponsorship: 8000, eventTicket: 3200, ... , byMonth: [...] }

GET /finance_expense_by_event?year=2026
  → { events: [ { name: 'Durga Puja 2025', total: 4200, venue: 1500, catering: 1800, ... } ] }

GET /finance_dashboard?year=2026
  → { totalIncome, totalExpense, net, topCategory, recentEntries[5], alerts[] }

GET /finance_date_range?from=2026-01-01&to=2026-03-31&type=income
  → { entries[], totals: { income, expense, net } }
```

**File:** `src/backend/banf-finance-api.js` (extend existing)

**Deliverables:**
- [ ] `get_finance_income_summary` — aggregated income by category + month
- [ ] `get_finance_expense_by_event` — expenses grouped by eventName
- [ ] `get_finance_dashboard` — KPI snapshot for dashboard widget
- [ ] `get_finance_date_range` — entries within arbitrary date range

---

### Phase 6: Member Portal Budget Reports
**Goal:** Replace the "Coming Soon" stub in member-portal.html with real financial transparency.

**Panel Features (read-only):**
- Annual summary: Total Income, Total Expense, Net Balance
- Income pie chart: Membership %, Sponsorship %, Events %, Other %
- Expense pie chart: Venue %, Catering %, Admin %, Other %
- Event cost list (simplified): Event Name | Total Cost
- Year selector

**Security:** Uses `/finance_income_summary` + `/finance_expense_by_event` (read-only, no individual entry details exposed to members)

**Deliverables:**
- [ ] Replace `comingSoon('Budget Reports')` with real panel
- [ ] Call aggregated report API endpoints
- [ ] Render summary KPIs + charts
- [ ] Year selector dropdown

---

### Phase 7: Continuous Pipeline (Scheduled Execution)
**Goal:** Make the reporting agent run on a schedule to maintain data freshness.

**Options:**
1. **GitHub Actions cron** — `banf-finance-reporting-agent.js` runs daily/weekly
2. **Wix Jobs** — `jobs.config` schedules backend functions
3. **Manual trigger** — Admin portal button "Refresh Reports"

**Recommended: Hybrid approach**
```yaml
# .github/workflows/banf-finance-agent.yml
name: BANF Finance Reporting Agent
on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday 6 AM UTC
  workflow_dispatch:       # Manual trigger
jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: node banf-finance-reporting-agent.js
      - run: |
          git add _finance-report-cache/
          git diff --cached --quiet || git commit -m "chore: update finance report cache"
          git push
```

**Alert Flow:**
```
Agent Run → Validates Data → Generates Reports → Detects Issues
  ↓                                                    ↓
Writes JSON cache                              Writes alerts.json
  ↓                                                    ↓
Portal reads cache on load               Admin sees alert badges
```

**Deliverables:**
- [ ] GitHub Actions workflow for scheduled agent runs
- [ ] Alert badge on admin portal Finance sidebar items
- [ ] "Last updated" timestamp on all report panels
- [ ] Manual "Refresh" button in admin portal

---

## Execution Order & Dependencies

```
Phase 1 ──────────────────▶ Phase 2 ──────▶ Phase 3
(Ledger Panel)              (Income)        (Event Expenses)
       │                                          │
       └──────────────┐                           │
                      ▼                           ▼
                Phase 4 ◀─────────────────────────┘
                (Reporting Agent)
                      │
                      ▼
                Phase 5
                (New API Endpoints)
                      │
              ┌───────┴───────┐
              ▼               ▼
         Phase 6         Phase 7
         (Member Portal) (CI/CD Pipeline)
```

**Phase 1** can start immediately — all backend APIs exist.
**Phases 2 & 3** are independent of each other, can parallelize.
**Phase 4** should run after 1-3 so it can validate the UI data flow.
**Phase 5** optimizes API calls (can defer until portal works with raw data).
**Phase 6 & 7** are independent leaf tasks.

---

## File Inventory (New + Modified)

| File | Action | Phase |
|---|---|---|
| `docs/admin-portal.html` | MODIFY — add 3 sidebar items + 3 panel sections | 1, 2, 3 |
| `docs/member-portal.html` | MODIFY — replace Budget Reports stub | 6 |
| `banf-finance-reporting-agent.js` | CREATE — Node.js reporting agent | 4 |
| `src/backend/banf-finance-api.js` | MODIFY — add 4 aggregation endpoints | 5 |
| `.github/workflows/banf-finance-agent.yml` | CREATE — scheduled agent workflow | 7 |
| `_finance-report-cache/latest.json` | AUTO-GENERATED by agent | 4, 7 |

---

## Data Flow: Ledger Entry Lifecycle

```
1. ENTRY CREATED
   Source: Manual (admin portal) | Bank sync | Zelle import | Reimbursement approval
   → POST /ledger_entry_create { date, amount, type, category, description, eventName, vendorId }
   → Written to FinancialEntries collection

2. ENTRY CATEGORIZED
   Required fields: type (income/expense), category (from predefined list), eventName (if expense)
   → Reporting Agent validates: missing category? missing event? duplicate?

3. ENTRY RECONCILED
   → POST /reconcile { year }
   → Matches entry against bank evidence (email confirmation, Drive receipts)
   → Sets reconciled=true, reconciledAt, reconciledBy

4. ENTRY REPORTED
   → GET /ledger?year=2026 pulls all entries
   → Frontend groups by date range, category, event
   → Snapshot cached by reporting agent for fast portal load
```

---

## Success Criteria

| Requirement | Measured By |
|---|---|
| Ledger report with date range filters | Admin can select "Last Month" and see filtered entries |
| Total membership income for the year | KPI card shows sum of `category=membership` entries |
| Total sponsor income for the year | KPI card shows sum of `category=sponsorship` entries |
| Event-wise expense breakdown | Table shows each event with per-category costs |
| Reporting agent maintains data | Agent runs weekly, validates integrity, generates snapshots |
| Correct dates on all entries | Agent flags entries with missing/invalid dates |
| Continuous process | GitHub Actions cron runs agent, auto-commits cache |
