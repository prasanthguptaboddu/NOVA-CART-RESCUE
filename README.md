# NOVA CART Reliance Engine 🛡️
> **Fulfillment friction diagnostic, real-time inventory risk gate, and second-order retention recovery system for NOVA CART quick-commerce.**

[![Build & Compilation](https://img.shields.io/badge/Build-Passing-emerald)](https://github.com/)
[![Tests](https://img.shields.io/badge/Tests-12%2F12%20Passing-emerald)](https://github.com/)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)
[![Budget Compliance](https://img.shields.io/badge/Budget-₹18.5L%20%2F%20₹25.0L%20Cap-emerald)](docs/business-impact.md)

---

## 1. Executive Summary & One-Line Pitch
The **NOVA CART Reliance Engine** is an operational dispatch and retention platform that prevents dark-store phantom stockouts, resolves in-flight delivery friction preemptively, and drives second-order conversion through consumption-cycle pantry replenishment—delivering a **7.7x ROI** within a strict **₹25 Lakh budget limit**.

---

## 2. Problem Diagnosis & Evidence

### The Core Business Problem
NOVA CART acquires **120,000 new customers per month** through introductory vouchers (₹150 off on ₹499 minimum spend), but suffers a catastrophic drop-off at Order #2:
- **Baseline Second-Order Conversion Rate**: Only **19.4%** (80.6% churn immediately after first order).
- **30-Day Repeat Purchase Rate**: Only **13.8%**.

### The Case Evidence: First-Order Fulfillment Friction
Operational analysis reveals that **28.6% of all first orders suffer a critical fulfillment failure**:
1. **Phantom Inventory Stockouts (14.2% of first orders)**: Items displayed as in-stock on the consumer app are missing on dark-store shelves due to unrecorded shrinkage or reservation drift.
2. **Picking Queue & SLA Breaches (11.5% of first orders)**: Dark-store picking congestion pushes order fulfillment past 30–45 minutes against a 15–20 minute promise.
3. **Damaged Produce & Inaccuracies (2.9% of first orders)**: Crushed eggs or unverified variant packing.

### The Churn Chasm: Empirical Impact
| First-Order Customer Experience | 2nd-Order Repeat Rate | Churn Rate | Impact |
| :--- | :--- | :--- | :--- |
| **Zero Friction (Smooth Delivery)** | **42.1%** | 57.9% | Strong organic repeat habit |
| **Friction-Afflicted (1+ Failure)** | **8.6%** | **91.4%** | **4.9x Destruction of Retention** |

**Strategic Root Cause**: Churn is not caused by weak marketing or lack of coupons; it is caused by broken delivery promises that destroy customer trust before habit formation can take root.

---

## 3. The Solution: Reliance Engine Architecture

### Core Modules
1. **Pre-Checkout Inventory Risk Shield (Phantom Stock Gate)**:
   - Evaluates real-time shelf-to-app stock drift and calculates a `phantom_risk_score` for every SKU.
   - Enables 1-click physical shelf count audits and instant SKU quarantining to stop phantom orders before checkout.
2. **Dark-Store Dispatch & Live Picker Triage Console**:
   - Live order stream across dark-store clusters (Koramangala, Indiranagar, HSR Layout, Whitefield).
   - Real-time picker checklist with **algorithmic in-stock substitution** at zero customer price delta.
3. **Preemptive Customer SLA Rescue Trigger**:
   - Injects a **₹50 Reliance Pass credit** directly into the customer's wallet *before* delivery delays trigger churn or expensive support tickets (saving ₹65/ticket in call-center OPEX).
   - Drops customer churn risk score from 89% to 18%.
4. **Second-Order Next-Basket Replenishment Generator**:
   - Replaces blanket discounting with personalized pantry restock baskets aligned with household consumption cycles (milk in 3 days, bread in 4 days).
   - Automatically applies the customer's ₹50 Reliance Pass credit for frictionless 1-tap re-orders.
5. **Executive ROI & Financial Simulator**:
   - Rigorous mathematical projection distinguishing Case Facts, Assumptions, and Simulated Results.
   - Interactive sensitivity slider demonstrating net profit and payback across 40%–85% friction reduction targets.

---

## 4. Technology Stack & Design Decisions

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, responsive dark operational UI.
- **Backend**: Express.js REST API co-located with Vite dev server and standalone production server (`server.ts`).
- **Database**: SQLite 3 via `@libsql/client` with declarative Prisma schema (`prisma/schema.prisma`) and relational DDL (`prisma/schema.sql`).
- **Portability**: Zero external database servers, zero cloud credential dependencies. The complete SQLite database (`prisma/dev.db`) is self-contained.

---

## 5. Project Structure

```
novacart-reliance-engine/
├── docs/
│   ├── problem-diagnosis.md     # Root cause analysis & churn chasm
│   ├── solution.md              # Target users, workflows & value mechanism
│   ├── architecture.md          # Technical stack, database topology & APIs
│   ├── business-impact.md       # ROI models, budget allocation & calculations
│   ├── prompt-journey.md        # Strategic reasoning & decision log
│   ├── demo-script.md           # 3–5 minute competition demo walkthrough
│   ├── github-description.md    # Repository tags & feature summary
│   └── linkedin-post.md         # Professional announcement post
├── prisma/
│   ├── schema.prisma            # Declarative Prisma schema
│   ├── schema.sql               # SQLite schema DDL
│   ├── seed.ts                  # Seed script with authentic case data
│   └── dev.db                   # Embedded SQLite database
├── server/
│   ├── api.ts                   # Express REST endpoints
│   ├── db.ts                    # SQLite database client & migrations
│   └── schema.sql               # Relational DDL
├── src/
│   ├── components/
│   │   ├── Navbar.tsx           # Navigation, health badges & data reset
│   │   ├── DiagnosticCockpit.tsx# Case evidence & churn chasm visualizer
│   │   ├── OperationsConsole.tsx# Dark-store picking & live triage console
│   │   ├── InventoryShield.tsx  # Phantom stock gate & shelf audit tool
│   │   ├── SecondOrderLoop.tsx  # Next-basket replenishment generator
│   │   └── FinancialImpact.tsx  # 6-month financial model & sensitivity slider
│   ├── App.tsx                  # Main application orchestrator
│   ├── main.tsx                 # React DOM mount point
│   ├── index.css                # Tailwind CSS v4 entry point
│   └── types.ts                 # TypeScript type definitions
├── tests/
│   └── api.test.ts              # Automated test suite (12 test cases)
├── .env.example                 # Environment variable templates
├── .gitignore                   # Clean ignore configuration
├── LICENSE                      # MIT License
├── package.json                 # Dependencies & execution scripts
├── server.ts                    # Production standalone Express server
├── tsconfig.json                # TypeScript configuration
└── vite.config.ts               # Vite configuration with API middleware plugin
```

---

## 6. Quick Start & Execution

### Prerequisites
- Node.js 18+ (or Bun 1.2+)
- npm or bun

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database
Initialize tables and populate realistic dark-store, SKU, order, and customer records:
```bash
npm run seed
```

### 3. Run Automated Tests
Execute the 12-point backend, database, and business logic verification suite:
```bash
npm run test
```

### 4. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 5. Production Build & Execution
```bash
npm run build
npm start
```

---

## 7. Business Impact & Budget Compliance

### Compliance with the ₹25.0 Lakh Budget Cap
The case brief specifies a strict ceiling of **₹25 Lakhs (₹2,500,000)** over 6 months:

| Category | Allocated Spend | % of Budget | Description |
| :--- | :--- | :--- | :--- |
| Preemptive Wallet Credits | ₹8,40,000 | 33.6% | Targeted ₹50 credits for friction-impacted users |
| Software & Telephony Integration | ₹4,80,000 | 19.2% | SMS alerts, picker API sync, database hosting |
| Dark-Store Picker Incentives & Audit Tools | ₹3,60,000 | 14.4% | Per-audit cycle count bonus for dark store staff |
| Staff Training & Quality Oversight | ₹1,70,000 | 6.8% | 4-week dark store supervisor training |
| **Total Implementation Spend** | **₹18,50,000** | **74.0%** | **Under ₹25L Budget Limit** |
| **Unallocated Safety Contingency** | **₹6,50,000** | **26.0%** | **Unallocated buffer reserve** |

### Projected 6-Month Returns
- **Second-Order Repeat Conversion**: Lifted from **19.4% to 39.0%** (+19.6 percentage points).
- **Monthly Incremental Repeat Orders**: **+23,561 orders/month**.
- **Monthly Incremental Repeat GMV**: **₹1.14 Crores/month**.
- **6-Month Net Profit Contribution**: **₹1.43 Crores** (margin contribution + support OPEX saved).
- **Return on Investment (ROI)**: **7.75x**.
- **Payback Period**: **24 days** (under 1 month).

---

## 8. Verification & Test Report

All 7 validation passes passed with zero errors:
- **Pass 1 — Build Validation**: `npm run build` succeeds cleanly via Vite.
- **Pass 2 — TypeScript Validation**: `npm run lint` (`tsc --noEmit`) passes with 0 type errors.
- **Pass 3 — Database Validation**: SQLite schema DDL initializes all 8 relational tables and foreign keys without errors.
- **Pass 4 — Automated Test Suite**: 12/12 automated integration tests passing in `tests/api.test.ts`.
- **Pass 5 — Core Functionality Validation**: User input triggers real parameterized SQL updates across picking, shelf audits, preemptive credit injections, and 2nd-order checkouts.
- **Pass 6 — UI Validation**: Fully responsive desktop and mobile views with zero layout shifts or visual clutter.
- **Pass 7 — Budget & Constraint Verification**: Implementation spend mathematically verified at ₹18.5 Lakhs vs ₹25.0 Lakhs cap.

---

## 9. License
Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
