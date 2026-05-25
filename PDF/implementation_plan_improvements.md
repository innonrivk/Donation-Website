# Implementation Plan — Gap Analysis & Improvement Suggestions

> **Source Plan:** `Monthly Donation Program Implementation Plan`
> **Analysis Date:** 2026-05-18

---

## 🔴 Critical Gaps (Must Fix Before Dev Starts)

### 1. Security: API Conventions are Broken
**Current Problem:**
- `GET /api/v1/User/GET/getIsUserExist?email={email}` — Exposes email as a query param. An attacker can enumerate all registered emails (user enumeration attack).
- `GET /api/v1/Transaction/GET/isValidCreditCard` — **Never validate credit card data via a GET request.** GET requests are logged by servers and proxies, which would expose card data in plain text.
- Naming convention `POST/GET` embedded in the URL path is non-standard and semantically confusing.

**Recommendation:**
```
# Revised REST-compliant API structure
POST   /api/v1/auth/login              # Login (POST only, never GET)
POST   /api/v1/auth/register           # Register
GET    /api/v1/users/me                # Get current user (JWT-protected)
POST   /api/v1/donations/subscribe     # Create Stripe subscription
POST   /api/v1/webhooks/stripe         # Receive Stripe events
GET    /api/v1/content                 # Public content
```
- Use `Authorization: Bearer <JWT>` headers for all protected endpoints.
- Never pass sensitive data (email, card info) in query strings.

---

### 2. Security: No Authentication Strategy Defined for Phase 1
**Current Problem:**
Phase 3 defers JWT auth to a later phase, but Phase 2 already builds the donation flow that creates users. Without auth, there's no way to protect the `/dashboard` or identify returning users between phases.

**Recommendation:**
- Move JWT authentication setup to **Phase 1** alongside the DB scaffold.
- Implement `bcrypt` password hashing on user creation (currently listed but not detailed).
- Define token expiry (e.g., `15min` access token + `7d` refresh token strategy).

---

### 3. Database: `total_donation_amount` Stored as a Derived Value
**Current Problem:**
`Users.total_donation_amount` is stored as a column that gets manually updated. This is an anti-pattern — if a transaction fails, a refund happens, or a payment is reversed by Stripe, this number becomes permanently wrong.

**Recommendation:**
- Remove `total_donation_amount` as a stored column on `Users`.
- Add a `Transactions` table (critical, noted but not formally defined):
  ```
  Transactions
  - id (PK, UUID)
  - user_id (FK → Users.id)
  - stripe_payment_intent_id (String, Unique)
  - amount (Integer, in cents)
  - status (Enum: 'succeeded', 'failed', 'refunded')
  - created_at (Timestamp)
  ```
- Calculate `total_donation_amount` dynamically: `SUM(amount) WHERE status = 'succeeded'`.
- This also gives you a full audit trail and accurate financial reporting.

---

### 4. No Stripe Webhook Handler Defined
**Current Problem:**
The plan uses Stripe for recurring payments but has no mention of a webhook endpoint. Stripe subscriptions are **asynchronous** — a subscription created today might fail payment next month. Without webhooks, the system won't know when:
- A monthly payment succeeds (to update tier).
- A payment fails (to notify user or pause account).
- A subscription is cancelled.

**Recommendation:**
Add a dedicated webhook handler as a first-class feature in Phase 2:
- `POST /api/v1/webhooks/stripe` — secured with Stripe webhook signature verification.
- Handle events: `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`.
- This is what should trigger `total_donation_amount` updates, NOT a scheduled cron job.

---

## 🟡 Important Improvements (Should Be Addressed)

### 5. Database: Missing `Transactions` Table & Missing Fields
The note about `Transactions` is mentioned as a parenthetical but never formally defined. Additionally, the existing tables are missing critical fields:

| Table | Missing Fields |
|---|---|
| `Users` | `stripe_customer_id`, `created_at`, `country`, `is_active` |
| `Projects_Detail` | `status` (active/inactive), `image_url`, `funding_goal`, `funded_amount` |
| `Tiers` | `name` (Regular/Shareholder/Patron), `perks` (JSON), `max_amount` |
| `Donation_Boxes` | `is_active`, `display_order`, `is_custom_amount` |
| `Website_Content` | `version`, `updated_at`, `updated_by` |

---

### 6. Financial Logic: "Piggy Bank" Accounting Is Unclear
**Current Problem:**
The plan states 10% goes to "Piggy Bank 1" and 10% to "Piggy Bank 2" but provides no technical implementation detail. Where is this money stored? Who can disburse it?

**Recommendation:**
- Add a `Piggy_Banks` table to track accumulated balances per project:
  ```
  Piggy_Banks
  - id (PK)
  - bank_type (Enum: 'donor_seed', 'shareholder_campaign')
  - project_id (FK → Projects_Detail.id, nullable)
  - balance (Integer, in cents)
  - period_month (Date)
  ```
- The 10% calculation should happen inside the Stripe webhook handler after a successful payment.
- Add a `Votes` table to record voting history per user per project.

---

### 7. Tier Boundary Inconsistency
**Current Problem:**
The tier ranges in Section 6 don't match the `Tiers` table in Section 3:
- Section 6 says Regular: `$1–$84`, Shareholders: `$85–$169`, Patron: `$170+`
- But the Shareholders voting calculation says: *"Every $10 above **$75**"* — this contradicts the $85 threshold.

**Recommendation:**
Formalize the tier boundaries in one single source of truth — the `Tiers` DB table — and reference it everywhere:

| Tier | Level | Min ($) | Max ($) |
|---|---|---|---|
| Regular | 1 | 1 | 84 |
| Shareholder | 2 | 85 | 169 |
| Patron | 3 | 170 | ∞ |

And clarify the voting formula: seeds should be based on **monthly donation amount**, while tier progression is based on **cumulative total**.

---

### 8. Frontend: Missing Admin Panel
**Current Problem:**
The plan mentions "Customizable website content (text, donation boxes, active projects)" as a key feature but there is no admin UI or admin routes defined anywhere in the frontend or backend.

**Recommendation:**
Add an Admin section as Phase 5 (or fold key parts into Phase 3):
- Route: `/admin` (protected by admin role)
- Features:
  - Edit `Website_Content` (WYSIWYG or simple form)
  - Manage `Donation_Boxes` (add/remove/reorder)
  - Manage `Projects_Detail` (add, activate/deactivate)
  - View donor list with tier breakdown and donation totals
- Backend: Add `role` field (`donor`, `admin`) to `Users` table and protect admin routes with role-based middleware.

---

## 🟢 Enhancements (Nice to Have)

### 9. Email Notification System
The plan mentions "Monthly newsletter" as a perk but provides no implementation path. Consider integrating **Resend** or **SendGrid**:
- Transactional emails: Donation confirmation, receipt with tax info.
- Monthly: Impact newsletter (can be scheduled via a simple cron job + email template).
- Tier upgrade notification.

### 10. Rate Limiting & Input Validation
Add middleware to the Express backend:
- **`express-rate-limit`**: Protect login, registration, and donation endpoints from brute force.
- **`zod`** or **`joi`**: Schema validation for all API request bodies. Currently, there's no validation layer described.

### 11. Environment & Deployment Plan
The plan has no mention of deployment. Add a minimal ops plan:
- **Environments**: `development` → `staging` → `production`
- **Hosting**: Vercel/Netlify (frontend), Railway/Render (backend + DB)
- **Secrets**: Use `.env` files, never commit API keys
- **CI/CD**: GitHub Actions for automated testing and deployment on merge to `main`

### 12. Testing Strategy
No testing is mentioned. At minimum, define:
- **Unit tests**: Business logic (tier calculation, seed calculation, piggy bank split).
- **Integration tests**: Stripe webhook handling, API endpoint contract tests.
- **Tools**: Vitest (React) + Jest/Supertest (Express).

---

## 📊 Revised Phase Plan

| Phase | Focus | Key Additions vs. Original |
|---|---|---|
| **Phase 1** | Foundation & Auth | Add JWT auth setup, define all DB tables incl. Transactions |
| **Phase 2** | Donation Flow & Stripe | Add **Stripe Webhook handler** as primary trigger |
| **Phase 3** | Dashboard & Notifications | Add email system (Resend/SendGrid), rate limiting, input validation |
| **Phase 4** | Admin Panel | CMS for content, donation boxes, and projects |
| **Phase 5** | Gamification & Voting | Seed/vote logic, Piggy Bank disbursement UI |
| **Phase 6** | Testing & Deployment | CI/CD, staging env, E2E tests |
