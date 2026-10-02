# Technical Architecture: NOVA CART Reliance Engine

## 1. System Overview & Architectural Topology

The NOVA CART Reliance Engine is built as a lightweight, high-performance, full-stack operational platform using modern TypeScript tooling:

```
[ Frontend: React 19 + TypeScript + Tailwind CSS ]
                       │
             HTTP / REST JSON APIs
                       │
[ Backend: Express.js Application Server & API Router ]
                       │
    ┌──────────────────┴──────────────────┐
    ▼                                     ▼
[ Business Logic & Engine Services ]   [ Pre-Checkout Risk Shield ]
 - Picker Triage & Dispatch             - Phantom Stock Score Evaluator
 - Smart Substitution Protocol          - Shelf-to-App Drift Auditor
 - Preemptive SLA Wallet Ingestion      - Next-Basket Replenishment
    └──────────────────┬──────────────────┘
                       │
          Database Access Layer (@libsql/client)
                       │
       [ SQLite Persistent Database (prisma/dev.db) ]
```

---

## 2. Technology Stack Rationale

| Layer | Chosen Technology | Engineering Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 (SPA) | Fast reactive rendering, seamless sub-millisecond tab switching, native TypeScript integration. |
| **Styling** | Tailwind CSS v4 | Zero-runtime CSS bundle, consistent operational visual hierarchy, responsive dark UI. |
| **Backend Framework** | Express.js | Standardized REST endpoints, lightweight routing, zero microservice bloat, runs co-located with dev & prod. |
| **Database Engine** | SQLite 3 via `@libsql/client` | Portable, zero-config, embedded file-based ACID storage (`prisma/dev.db`), easily packaged into git and ZIP without external database servers. |
| **Data Modeling** | Prisma Schema + DDL SQL | Declarative relational schema (`prisma/schema.prisma` and `prisma/schema.sql`) defining strict relations and constraints. |
| **Runtime & Tooling**| Vite 8 + tsx | Instant TypeScript compilation, HMR-free deterministic execution, integrated middleware mode. |

---

## 3. Database Schema & Relational Integrity

The application utilizes 8 relational entities:

1. **`stores`**: Represents physical dark stores (e.g., `DS-KOR-104`, `DS-HSR-108`) with SLA parameters, active picker capacity, and average pick velocity.
2. **`products`**: Item catalog with pricing, category, physical `shelf_stock`, consumer `app_stock`, `phantom_risk_score`, and drift diagnostics.
3. **`customers`**: User profiles tracking order history, wallet balance, lifetime spend, and real-time `churn_risk_score`.
4. **`orders`**: Real-time order state machine (`PENDING` → `PICKING` → `PACKED` → `OUT_FOR_DELIVERY` → `DELIVERED`). Tracks delivery promises, friction flags, and intervention status.
5. **`order_items`**: Individual line items with picking state (`PENDING`, `PICKED`, `OUT_OF_STOCK`, `SUBSTITUTED`) and substitution foreign keys.
6. **`interventions`**: Audit log of operational actions taken (preemptive credits, substitutions, VIP escalations) with associated cost and protected LTV.
7. **`support_tickets`**: Customer service tickets linked to orders with category, sentiment, and resolution cost tracking.
8. **`simulation_settings`**: Baseline and parameter configuration for the 6-month financial return model.

---

## 4. Key Architectural Decisions

### A. Co-located Express Middleware in Vite
- In development, the Express API is mounted directly inside Vite's dev server via an internal plugin (`vite.config.ts`), ensuring zero CORS friction, single-port operation on 3000, and no proxy latency.
- In production, `server.ts` boots Express, serves the static build from `dist/`, and handles all `/api/*` routes.

### B. Pure Portable SQLite vs External Database
- SQLite is self-contained within the repository (`prisma/dev.db`), requiring no Docker containers, Cloud SQL instances, or external credentials. Anyone cloning the repository or unzipping the archive can run `npm run seed` and `npm run dev` in under 10 seconds.

### C. Pessimistic Phantom Stock Gating
- Rather than waiting for order picking to fail, the inventory shield uses a heuristic score combining drift velocity and intake history. High-risk items can be audited or quarantined in one click.

---

## 5. Security & Reliability
- Parameterized SQL queries using `@libsql/client` prevent SQL injection vulnerabilities.
- Strict input validation on all audit and triage endpoints.
- ACID transactions ensure that customer wallet credits and order status transitions remain consistent even during concurrent actions.
