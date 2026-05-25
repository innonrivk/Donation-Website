# Implementation Review — Security & UI Enhancements (v2)

Reviewing [implementation_plan.md (v2)](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/implamention%20plans/implementation_plan.md) against the actual codebase, Stripe API behaviour, and production-readiness standards.

**Review Date:** 2026-05-25  
**Plan Version:** v2  
**Reviewer:** Senior Engineering Review  

---

## Overall Assessment

The v2 plan is a **significant improvement** over v1. The Zod validation, idempotency keys, atomic DB transactions, and SCA handling demonstrate a solid understanding of production payment architecture. The accessibility additions and CSS animation specifics are also welcome. However, several **critical gaps** remain that would cause bugs or security issues if not addressed before implementation begins.

---

## ✅ Strengths

| Area | Why It's Good |
|------|---------------|
| Zod validation schema | Correct field types, min/max constraints, and `startsWith('pm_')` guard on `paymentMethodId` — prevents garbage data from reaching Stripe |
| Idempotency key on subscription creation | Eliminates double-charge risk on network retries — a common production bug |
| `prisma.$transaction([...])` | Correctly identifies the atomicity gap between a successful Stripe call and a failed DB write |
| SCA / 3DS handling | Both `requires_action` and `requires_payment_method` states are acknowledged |
| `Set` for expanded card state | More performant and idiomatic than a plain object map |
| Dead CSS cleanup explicitly listed | Prevents stylesheet bloat and confusion |
| `max-height` animation strategy | Correct approach — `height: auto` is not animatable in CSS |
| Three Stripe test card scenarios in verification | Covers happy path, 3DS, and decline — a production-quality test matrix |

---

## 🔴 Critical Issues

### 1. `stripe.js` service — `upsertStripeCustomer` signature is underspecified

**The plan says:**
> Export a single `upsertStripeCustomer({ email, name, paymentMethodId, existingCustomerId? })` helper

**The problem:** The plan does not specify *how* to determine whether an existing customer already has this `paymentMethodId` attached. Blindly calling `paymentMethods.attach(pm_id, { customer: cus_id })` on an already-attached method throws a Stripe error (`"This PaymentMethod was previously used..."`). The existing `stripe.js` already has a `.catch(() => ({ id: paymentMethodId }))` silencer for this — but silencing all errors here is dangerous (it would also swallow real failures like an invalid PM ID).

**Fix to add to the plan:**
```js
// Correct approach: check if PM is already attached before attaching
try {
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
} catch (err) {
  if (err.code !== 'resource_already_exists') throw err;
  // PM already attached — safe to continue
}
```
The plan must specify this error code check, not a blanket catch.

---

### 2. `donations.js` — Stripe customer is created BEFORE DB upsert, but the plan wraps only DB ops in `prisma.$transaction`

**The problem:** The plan's flow is:
1. `upsertStripeCustomer(...)` ← Stripe API call (irreversible)
2. `createStripeSubscription(...)` ← Stripe API call (irreversible)
3. `prisma.$transaction([upsert User, insert Transaction])` ← DB

If step 3 fails, you have a real Stripe customer and subscription with **no corresponding DB record**. The user was charged but your app has no record of them. `prisma.$transaction` only guards against DB-level failures, not Stripe-then-DB failures.

**Fix to add to the plan:**
- After a Stripe subscription is created, if the DB write fails, log the raw Stripe `customerId` and `subscriptionId` to a **dead-letter log** (even just `console.error` with a structured payload) so the data can be manually reconciled.
- Long-term: use Stripe webhooks (`invoice.payment_succeeded`) as the *authoritative* source for inserting `Transaction` records — the webhook handler already exists in `webhooks.js` and does exactly this. The subscribe route should only create the sub; the webhook handles the DB record.

---

### 3. Duplicate-subscription guard queries Stripe, not your own DB first

**The plan says:**
> query Stripe for any existing `active` or `trialing` subscription for that customer

**The problem:** Querying Stripe's API for existing subscriptions adds 200–500ms of latency to every checkout and uses a Stripe API call unnecessarily. You already have `stripeCustomerId` in your `User` table. A faster and cheaper approach:

**Fix to add to the plan:**
1. First check your own DB: does this email have an existing `User` row with `stripeCustomerId`?
2. If yes, query `prisma.transaction.findFirst({ where: { userId, status: 'SUCCEEDED' }})` — if a recent transaction exists, return `409`.
3. Only fall back to querying Stripe directly if the DB state is ambiguous (e.g. `User` exists, `stripeCustomerId` set, but no `Transaction` record — possible after a webhook failure).

---

### 4. `StripeForm.jsx` — `confirmCardPayment` is the wrong method for subscriptions

**The plan says:**
```js
const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
```

**The problem:** `stripe.confirmCardPayment()` is for one-time `PaymentIntent` flows. For **subscriptions**, Stripe sets `payment_behavior: 'default_incomplete'` and the `clientSecret` comes from `subscription.latest_invoice.payment_intent.client_secret`. The correct method is still `stripe.confirmCardPayment()` — *but only if you expand `latest_invoice.payment_intent` in the subscription creation call.*

**The plan must explicitly state:**
- `createStripeSubscription` must include `expand: ['latest_invoice.payment_intent']` in the Stripe call (already in the existing `stripe.js` — keep it).
- The backend must return `subscription.latest_invoice.payment_intent.client_secret`, NOT `subscription.client_secret` (which does not exist on subscriptions).
- The `clientSecret` path in the response body must be explicitly documented: `{ clientSecret: subscription.latest_invoice.payment_intent.client_secret }`.

---

### 5. Amount units inconsistency — cents vs. dollars

**The plan's Zod schema says:**
```js
amount: z.number().int().min(100), // cents, min $1
```

**But** the existing `DonationCard.jsx` passes `amount` as **dollars** (e.g. `10`, `85`, `170`). The `DonationBox` model stores `amount` in **dollars**. If the client sends `10` (dollars) and the backend treats it as `10 cents`, a "$10/month" donor gets charged $0.10.

**Fix to add to the plan:**
- Explicitly document the unit boundary: the client sends `amount` in **dollars**, the backend converts to cents with `amount * 100` before passing to Stripe.
- Update the Zod schema to reflect: `amount: z.number().int().min(1)` (dollars), then multiply in the service layer.
- OR: update the client to send cents. Either is fine — but the plan must pick one and document it clearly.

---

## 🟡 Medium Issues

### 6. No rate limiting on the `/subscribe` endpoint

A publicly-accessible `/subscribe` endpoint with real Stripe calls is a target for abuse. The plan has no mention of rate limiting.

**Recommendation to add:**
- Use `express-rate-limit` (already a common Express middleware) with a rule of ~5 requests per IP per 15 minutes on the `/api/v1/donations` prefix. This is a single `npm install` and 5 lines of config in `index.js`.

---

### 7. `aria-expanded` on a `<div>` — semantics mismatch

**The plan says:**
> make the card a `<button>` or add `role="button"` + `tabIndex={0}` + `onKeyDown`

**The problem:** If the card contains interactive children (e.g. future links or buttons inside the description), nesting a `<button>` inside a `<div>` or making the whole card a button creates invalid HTML (interactive elements cannot be descendants of `<button>`).

**Better approach:**
- Keep the card as a `<div>`.
- Add a dedicated `<button class="project-card__expand-btn">` containing only the chevron + "Read more" text at the bottom of each card.
- This is the accessible pattern used by all major design systems (Material, Carbon, Ant Design).

---

### 8. `max-height` transition value is too arbitrary

**The plan says:**
```css
max-height: 60em; /* large enough for any description */
```

**The problem:** `60em` (960px) is an assumption. If a description ever exceeds this, it will clip silently. Also, the transition from `4.8em` to `60em` means even a short expansion animates over the full duration, making short descriptions feel slow to expand.

**Recommendation:**
- Use `max-height: 1000px` as the expanded value (a clearer unit for a fixed layout).
- Adjust `transition-duration` dynamically with a CSS custom property, or accept the trade-off and document it.
- Add a comment in the CSS explaining why `max-height` is used instead of `height`.

---

### 9. No loading skeleton for the `DonationProgramDetails` section

The `DonationPage.jsx` shows a full-page `page-loader__spinner` during the initial API fetch. Once the spinner disappears, all sections including `DonationProgramDetails` appear simultaneously. If the DB is slow, there's a jarring flash.

**Recommendation:** Add to the plan that `DonationProgramDetails` should receive a `loading` prop, rendering a skeleton placeholder (3 grey boxes matching the tier card dimensions) while data is fetching. This is a polish item but notably improves perceived performance.

---

## 🟢 Minor Suggestions

### 10. `stripe.js` — singleton instantiation should be guarded

The current `stripe.js` runs `new Stripe(process.env.STRIPE_SECRET_KEY)` at module import time. If `STRIPE_SECRET_KEY` is missing from `.env`, this throws synchronously at startup — not at request time — which makes the error harder to trace.

**Recommendation:** Add a startup guard:
```js
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
```

---

### 11. Verification plan is missing a DB state check

After the happy-path Stripe test, the plan says:
> Confirm a `201` response and a new `User` + `Transaction` row appear in the DB

But it doesn't say *how* to check this. Add to the verification plan:
```bash
# In /server
npm run db:studio  # Opens Prisma Studio at localhost:5555
# Then inspect the 'users' and 'transactions' tables
```

---

### 12. The open questions need answers before implementation starts

The three open questions in the plan are non-trivial:

| Question | Recommended Decision |
|----------|---------------------|
| Anonymous donors vs. required `User` row | **Auto-create** — Stripe requires a customer object; a DB `User` row gives you a reconciliation anchor. Keep the current plan. |
| Multiple subscriptions per donor | **Allow** — a Patron donor should be able to upgrade, not be blocked. The duplicate guard should check same-amount subscriptions, not all subscriptions. |
| Is `fundedAmount` / `fundingGoal` used elsewhere? | **No** — it's only in `ProjectsSection`. Safe to hide from the front-end while keeping the DB columns for future admin use. |

These decisions should be locked in the plan before coding begins, not left as open questions.

---

## Summary Table

| # | Severity | Issue | Action Required |
|---|----------|-------|-----------------|
| 1 | 🔴 Critical | `paymentMethods.attach` error handling is too broad | Use `err.code === 'resource_already_exists'` check |
| 2 | 🔴 Critical | Stripe-then-DB failure leaves orphaned charge with no DB record | Add dead-letter log; rely on webhook for Transaction insert |
| 3 | 🔴 Critical | Amount units undefined — cents vs. dollars mismatch | Document the boundary; client sends dollars, backend converts |
| 4 | 🔴 Critical | `confirmCardPayment` needs `latest_invoice.payment_intent.client_secret` path | Explicitly document the expanded clientSecret path |
| 5 | 🟡 Medium | No rate limiting on `/subscribe` | Add `express-rate-limit` |
| 6 | 🟡 Medium | `aria-expanded` on whole card creates nested-interactive issue | Use a dedicated expand button at the card bottom |
| 7 | 🟡 Medium | `max-height: 60em` is fragile | Use `1000px` with documented reasoning |
| 8 | 🟡 Medium | No loading skeleton for `DonationProgramDetails` | Add `loading` prop with skeleton cards |
| 9 | 🟢 Minor | Stripe singleton not guarded against missing env var | Add startup guard with clear error |
| 10 | 🟢 Minor | Verification plan missing DB inspection step | Add `npm run db:studio` to verification |
| 11 | 🟢 Minor | Open questions left unanswered | Resolve all 3 before implementation |

---

## Verdict

**The plan is ready to implement after resolving issues #1, #2, #3, and #4.** These are production correctness issues that would manifest as real bugs: silent error swallowing, orphaned Stripe charges, wrong payment amounts, and broken 3DS flows. Issues #5–#8 should be incorporated into the plan before coding starts — they are one-day additions, not afterthoughts.
