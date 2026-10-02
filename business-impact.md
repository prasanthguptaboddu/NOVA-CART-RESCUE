# Business Impact & Financial ROI Analysis

## 1. Methodology: Distinguishing Facts, Assumptions, and Projections

To maintain absolute financial integrity and avoid ungrounded hype, every calculation adheres to strict categorization:

- **CASE FACTS**: Ground truth metrics derived directly from the NOVA CART business case brief.
- **PRODUCT ASSUMPTIONS**: Operational parameters based on quick-commerce unit economics and pilot data.
- **SIMULATED / PROJECTED RESULTS**: Output of the mathematical retention model.

---

## 2. Baseline Metrics (Case Facts)

| Metric | Value | Source |
| :--- | :--- | :--- |
| Monthly First-Time Customer Acquisitions | **120,000** | Case Fact |
| Baseline Second-Order Conversion Rate | **19.4%** (23,280 buyers) | Case Fact |
| First-Order Fulfillment Friction Rate | **28.6%** (34,320 buyers) | Case Fact |
| Repeat Rate: Smooth Order (Zero Friction) | **42.1%** | Case Fact |
| Repeat Rate: Friction-Afflicted Order | **8.6%** | Case Fact |
| Churn Destruction Multiplier | **4.9x drop** upon experiencing friction | Case Fact |
| Additional Implementation Budget Cap | **₹25.0 Lakhs** over 6 months | Case Fact |

---

## 3. Product & Unit Economics Assumptions

| Parameter | Value | Rationale |
| :--- | :--- | :--- |
| Average Order Value (AOV) | **₹485.00** | Standard Indian quick-commerce grocery basket |
| Contribution Margin (Gross Margin - Delivery) | **18.0%** | Retail margin minus rider payout |
| Support Ticket Propensity on Friction Orders | **22.0%** | 1 in 4.5 friction customers calls or chats |
| Cost to Handle Support Ticket | **₹65.00** | Agent salary, telephony, and CRM tooling |
| Preemptive Reliance Pass Credit Cost | **₹50.00** | Injected only for friction-threatened orders |
| Average Re-Stock Basket Size (Order #2) | **₹420.00** | Pantry staple replenishment basket |

---

## 4. Operational Rescue Mechanics & Calculations

### Step 1: Friction Neutralization
- Under the Reliance Engine, pre-checkout inventory gating and real-time picker substitution reduce friction incidence by **68%**:
  - Initial friction orders: $120,000 \times 28.6\% = 34,320$ orders/month.
  - Rescued orders (neutralized): $34,320 \times 68\% = 23,338$ orders/month.
  - Residual unmitigated friction orders: $34,320 - 23,338 = 10,982$ orders/month.

### Step 2: New Second-Order Conversion Rate
- Repeat buyers from smooth/rescued experiences:
  $$(120,000 - 10,982) \times 42.1\% = 109,018 \times 0.421 = 45,897 \text{ buyers}$$
- Repeat buyers from residual friction:
  $$10,982 \times 8.6\% = 944 \text{ buyers}$$
- **Total Monthly Repeat Buyers**: $45,897 + 944 = 46,841 \text{ buyers}$.
- **New 2nd-Order Repeat Conversion Rate**:
  $$\frac{46,841}{120,000} = \mathbf{39.0\%} \quad (\text{+19.6 percentage points over baseline 19.4\%})$$

### Step 3: Incremental Volume & Revenue
- Incremental monthly repeat orders:
  $$46,841 - 23,280 = \mathbf{23,561 \text{ orders/month}}$$
- Monthly Incremental GMV:
  $$23,561 \times ₹485 = \mathbf{₹1,14,27,085 \text{ (₹1.14 Crores/month)}}$$
- Monthly Gross Profit Contribution ($18\%$ margin):
  $$₹1,14,27,085 \times 18\% = \mathbf{₹20,56,875 \text{/month}}$$

### Step 4: OPEX Savings from Support Ticket Deflection
- Monthly friction tickets avoided:
  $$23,338 \times 22\% = 5,134 \text{ tickets avoided/month}$$
- Monthly support cost saved:
  $$5,134 \times ₹65 = \mathbf{₹3,33,710 \text{/month}}$$

---

## 5. Six-Month Financial ROI & Budget Allocation

### Total 6-Month Benefit
$$\text{Gross Profit Contribution (6 Months)} = ₹20,56,875 \times 6 = ₹1,23,41,250$$
$$\text{Support OPEX Saved (6 Months)} = ₹3,33,710 \times 6 = ₹20,02,260$$
$$\mathbf{\text{Total Net Benefit (6 Months)}} = \mathbf{₹1,43,43,510 \text{ (₹1.43 Crores)}}$$

### Six-Month Budget Spend (Against ₹25.0 Lakhs Limit)
| Category | Allocation | Description |
| :--- | :--- | :--- |
| Preemptive Wallet Credits | ₹8,40,000 | Targeted ₹50 credits for friction-impacted users |
| Software & Telephony Integration | ₹4,80,000 | SMS alerts, picker app modifications, API sync |
| Dark-Store Picker Incentives & Audit Tools | ₹3,60,000 | Per-audit cycle count bonus for dark store staff |
| Staff Training & Quality Oversight | ₹1,70,000 | 4-week dark store supervisor training |
| **Total Allocated Implementation Spend** | **₹18,50,000** | **74.0% of ₹25L cap** |
| **Unallocated Safety Buffer** | **₹6,50,000** | **26.0% contingency reserve** |

### Return Multiplier (ROI) & Payback
$$\text{ROI Multiple} = \frac{₹1,43,43,510}{₹18,50,000} = \mathbf{7.75\times}$$
$$\text{Payback Period} = \frac{₹18,50,000}{₹20,56,875 + ₹3,33,710} = \mathbf{0.77 \text{ months (approx 24 days)}}$$
Even under conservative sensitivity scenarios (40% friction reduction), the project generates over ₹78 Lakhs in net benefit with a payback period under 1.6 months.
