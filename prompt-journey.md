# Prompt Journey & Decision Architecture

This document records the strategic reasoning stages and product decisions that shaped the **NOVA CART Reliance Engine**.

---

## Stage 1: Evidence Triage & False Trail Elimination

### Initial Hypothesis Tested:
- *Should we build an AI-powered conversational shopping assistant or recipe recommender for consumer carts?*
- **Rejection Reasoning**:
  - The case data indicates that top-of-funnel customer acquisition is already robust (120,000 users/month).
  - Users are not dropping off because they do not know what groceries to buy.
  - Adding an AI chatbot would add unnecessary latency, API cost, and operational distraction without fixing the broken delivery promise.

---

## Stage 2: Isolating the Mathematical Churn Lever

### The Pivotal Insight:
- Comparing cohort repeat rates:
  - Zero-friction first order: **42.1% repeat conversion**.
  - Friction-afflicted first order: **8.6% repeat conversion**.
- **Conclusion**: A 4.9x drop in retention happens solely due to operational friction (phantom stockouts and delivery delays). 
- Every rupee spent acquiring new users is wasted if 28.6% of them hit a fulfillment wall. The single highest-leverage intervention point in the entire business is the **Dark Store Picking & Dispatch Window**.

---

## Stage 3: Operational Constraint Stress Testing

### Budget & Time Boundary:
- Maximum additional budget: **₹25 Lakhs (INR 2.5 Million)** over **6 months**.
- **Ruled Out**:
  - Building new dark stores / distribution hubs (costs crores).
  - Doubling delivery fleet size (massive fixed payroll costs).
  - Blanket coupon discounting (burns contribution margin).
- **Selected Path**:
  - A lightweight, software-driven intervention system leveraging existing store pickers and inventory databases.
  - Targeted preemptive ₹50 wallet credits awarded only to friction-impacted users before SLA breach, accompanied by proactive algorithmic substitutions.

---

## Stage 4: Architecture & Engineering Strategy

### Full-Stack Architecture Decision:
- **Decision**: Next.js/React SPA + Express REST backend + SQLite database via `@libsql/client` and Prisma schema.
- **Why SQLite**:
  - 100% portable, embedded zero-config database file (`prisma/dev.db`).
  - No external database credentials or cloud service dependencies.
  - Reproducible with a single command (`npm run seed`).
  - Perfect for rapid competition evaluation, local execution, and GitHub publishing.

---

## Stage 5: Product Validation & Verification Gates
1. **Database & Seed Validation**: Real stores, products with phantom drift scores, orders, customers, and support tickets seeded in SQLite.
2. **Interactive Triage Testing**: Every button (Auto-Substitute, Preemptive Rescue, Shelf Audit, One-Tap Restock) executes real parameterized SQL queries and updates persistent application state.
3. **Financial Sensitivity Verification**: Interactive ROI model demonstrates verifiable payback within 24–45 days under the strict ₹25 Lakh budget limit.
