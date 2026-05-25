# Implementation Plan — Security & UI Enhancements (v2)

> **Revised from v1** — Added: Zod schema validation, idempotency key protection, stripe.js service layer refactor, error code taxonomy, duplicate-subscription guard, a11y improvements, and richer CSS animation spec.

---

## User Review Required

> [!IMPORTANT]
> **Stripe Secret Key is 100% Server-Side**
> The client ONLY uses the **publishable key** (safe to expose) to collect a tokenised `PaymentMethod` via Stripe Elements. The actual subscription and customer creation is performed by the backend using the **secret key**, which never leaves the server. This satisfies PCI-DSS SAQ-A compliance.

> [!WARNING]
> **Do NOT run `db:setup` on a live database without a backup.**
> The seed script calls `deleteMany()` on every table before inserting. Only run it on development or a freshly provisioned DB.

> [!CAUTION]
> **3D Secure / SCA**
> European cards increasingly require Strong Customer Authentication. The plan explicitly handles the `"requires_action"` / `"requires_payment_method"` subscription states so donations from EU donors are not silently dropped.

---

## Open Questions

1. Should the `/subscribe` endpoint allow anonymous donors (no user account), or must every donor have a persisted `User` row? *(Current plan: auto-create a minimal `User` row.)*
2. Should a donor who already has an active subscription be blocked from subscribing a second time, or allowed (multiple tiers)?
3. Is the "raised amount" data (`fundedAmount`, `fundingGoal`) still being used anywhere else — e.g. admin panels — or can those columns be ignored entirely on the front-end?

---

## Proposed Changes

### 1 — Backend: Stripe Service Layer Refactor

The existing `stripe.js` service has a bug: it tries to `attach` a `paymentMethodId` **before** a customer exists, which Stripe rejects. We also need to expose a clean API surface for the route layer.

#### [MODIFY] [stripe.js](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/src/services/stripe.js)

**Improvements over v1:**
- Fix the premature `paymentMethods.attach()` — Stripe requires the customer to exist first. Correct order: `customers.create` → `paymentMethods.attach`.
- Export a single `upsertStripeCustomer({ email, name, paymentMethodId, existingCustomerId? })` helper that handles both new and returning customers in one call, eliminating the branching logic that currently lives in the route.
- Add `idempotencyKey` option to `createStripeSubscription` (use a deterministic hash of `customerId + amountCents`) to prevent duplicate subscriptions if the client retries.
- Export the `stripe` singleton at the bottom for the webhook handler to reuse *(already done — keep it)*.

---

### 2 — Backend: Subscription Route

#### [MODIFY] [donations.js](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/src/routes/donations.js)

**v1 flow was correct in concept. Improvements:**

1. **Zod validation** — replace the manual `if (!email || ...)` check with a Zod schema:
   ```js
   import { z } from 'zod';
   const SubscribeSchema = z.object({
     email:           z.string().email(),
     firstName:       z.string().min(1).max(80),
     lastName:        z.string().min(1).max(80),
     country:         z.string().min(2).max(60),
     paymentMethodId: z.string().startsWith('pm_'),
     amount:          z.number().int().min(100), // cents, min $1
   });
   ```
   Return `400` with structured field-level errors so the client can map them.

2. **Duplicate-subscription guard** — before creating a new Stripe subscription, query Stripe for any existing `active` or `trialing` subscription for that customer. If one exists for the same `amount`, return `409 Conflict` with a meaningful message instead of charging the card twice.

3. **Atomic DB upsert** — wrap the `User` upsert + `Transaction` insert in a `prisma.$transaction([...])` block so a DB failure after Stripe success doesn't leave orphaned data.

4. **Full flow (corrected step order)**:
   1. Parse & validate body with Zod → return `400` on failure.
   2. `upsertStripeCustomer(...)` — create or retrieve customer, attach payment method.
   3. Duplicate-subscription guard.
   4. `createStripeSubscription({ customerId, amountCents, idempotencyKey })`.
   5. Upsert `User` row in DB (create if missing, update `stripeCustomerId` if needed).
   6. If subscription `status === 'active'` → insert `Transaction(SUCCEEDED)` + respond `201`.
   7. If subscription `status === 'incomplete'` (SCA required) → respond `202` with `{ clientSecret, status: 'requires_action' }`.
   8. Any Stripe `StripeCardError` → respond `402` (Payment Required) with user-facing message.
   9. Unknown errors → pass to Express error handler via `next(error)`.

5. **Structured error response shape** (consistency across the API):
   ```json
   { "error": "card_declined", "message": "Your card was declined.", "field": null }
   ```

---

### 3 — Client: StripeForm — Proper Payment Flow

#### [MODIFY] [StripeForm.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/checkout/StripeForm.jsx)

**Improvements over v1:**

1. **Remove all mocked code** — delete the `await new Promise(resolve => setTimeout(resolve, 1000))` and `paymentMethodId: 'pm_mock_123'`.

2. **Correct `createPaymentMethod` call** with billing details to reduce card decline rate:
   ```js
   const { paymentMethod, error } = await stripe.createPaymentMethod({
     type: 'card',
     card: elements.getElement(CardElement),
     billing_details: {
       name: `${formData.firstName} ${formData.lastName}`,
       email: formData.email,
     },
   });
   ```

3. **Handle SCA** — if the backend responds with `status: 'requires_action'`:
   ```js
   const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
   if (confirmError) throw new Error(confirmError.message);
   ```

4. **Error display** — map structured backend error codes (e.g. `card_declined`, `insufficient_funds`) to friendly user messages rather than raw API strings.

5. **UX — disable submit button** while `!stripe || !elements` OR while `loading`, not just `!stripe`.

6. **Accessibility** — add `aria-live="polite"` on the error `<div>` so screen readers announce payment errors.

---

### 4 — Client: Click-to-Expand Project Cards

#### [MODIFY] [ProjectsSection.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/donation/ProjectsSection.jsx)

**Improvements over v1:**

1. Remove entire `.project-card__funding` block (progress bar, funded/goal amounts, percentage).

2. Use a `Set` in state for tracked expanded IDs — cleaner than an object map:
   ```js
   const [expanded, setExpanded] = useState(new Set());
   const toggle = (id) => setExpanded(prev => {
     const next = new Set(prev);
     next.has(id) ? next.delete(id) : next.add(id);
     return next;
   });
   ```

3. **Accessibility** — make the card a `<button>` or add `role="button"` + `tabIndex={0}` + `onKeyDown` handler (Enter / Space) so keyboard users can expand cards too.

4. **`aria-expanded`** attribute on the card toggles for screen readers.

5. Pass `isExpanded` as a prop-style boolean to the card element to drive both the CSS class and the `aria-expanded` attribute.

#### [MODIFY] [ProjectsSection.css](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/donation/ProjectsSection.css)

1. Remove all `.project-card__funding*`, `.project-card__progress*`, `.project-card__funded`, `.project-card__goal`, `.project-card__percent` rules — dead code once the HTML is gone.

2. Animate card expansion without `height: auto` jank — use `max-height` transition:
   ```css
   .project-card__details {
     /* collapsed */
     display: -webkit-box;
     -webkit-line-clamp: 3;
     -webkit-box-orient: vertical;
     overflow: hidden;
     max-height: 4.8em;           /* ~3 lines × 1.6 line-height */
     transition: max-height 0.35s ease, -webkit-line-clamp 0s 0.35s;
   }
   .project-card--expanded .project-card__details {
     -webkit-line-clamp: unset;
     overflow: visible;
     max-height: 60em;            /* large enough for any description */
     transition: max-height 0.35s ease;
   }
   ```

3. Chevron icon — rotates 180° on expand, smooth cubic-bezier:
   ```css
   .project-card__chevron {
     transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
   }
   .project-card--expanded .project-card__chevron {
     transform: rotate(180deg);
   }
   ```

4. Remove the `transform: translateY(-4px)` hover lift from `.project-card:hover` when expanded, to avoid jarring layout shift while reading.

---

### 5 — Client: Fallback Data for Donation Tiers & Objectives

#### [MODIFY] [DonationPage.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/pages/DonationPage.jsx)

**Improvement over v1:** The current `catch` block fallback has empty `tiers: []` and `milestones: []`. Fill them in so the `DonationProgramDetails` section renders even when the API is unreachable (offline demo, slow DB start, etc.).

Fallback data must match [Monthly Donation Program tiers and objectives.md](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/PDF/Monthly%20Donation%20Program%20tiers%20and%20objectives.md) exactly:

**Tiers fallback:**
| Tier | Range | Perks |
|------|-------|-------|
| Regular | $1–$84/mo | Newsletter, yearly zoom event, seed coupons (1 seed = $1), group tours at discounted rate |
| Shareholder | $85–$169/mo | All Regular perks + quarterly progression meetings, campaign voting, design voting; +1 vote per $10 above $75 |
| Patron | $170+/mo | All Shareholder perks + name on camp T-shirt sponsors section, quarterly social media thank-you posts |

**Milestones fallback:**
| Amount | Label | Description | Repeatable |
|--------|-------|-------------|------------|
| $1,020 | Silver "OMP Friend" | Silver certificate sent to your home | No |
| $2,040 | Gold "OMP Friend" | Gold certificate sent to your home | No |
| $3,060 | Platinum "OMP Friend" | Platinum certificate sent to your home | No |
| $6,000 | Camp Patron | Camp named after you; picture printed at camp center | Yes |
| $10,000 | Patreon Wall | Permanent place on OMP's patreon wall at the center | No |

---

## Files Changed Summary

| File | Type | Reason |
|------|------|--------|
| `server/src/services/stripe.js` | MODIFY | Fix attach-before-create bug; add `upsertStripeCustomer`; add idempotency |
| `server/src/routes/donations.js` | MODIFY | Zod validation, real Stripe calls, atomic DB tx, SCA handling, error codes |
| `client/src/components/checkout/StripeForm.jsx` | MODIFY | Remove mock, real `createPaymentMethod`, SCA confirm, a11y |
| `client/src/components/donation/ProjectsSection.jsx` | MODIFY | Remove funding block, Set-based expand state, keyboard a11y |
| `client/src/components/donation/ProjectsSection.css` | MODIFY | Remove dead rules, `max-height` transition, chevron animation |
| `client/src/pages/DonationPage.jsx` | MODIFY | Populate tiers & milestones in offline fallback data |

---

## Verification Plan

### Build Checks
```bash
# In /client
npm run build          # Must compile with 0 errors

# In /server
npm run dev            # Must start with no import/syntax errors
```

### Stripe Integration Test (test mode keys)
1. Use Stripe test card `4242 4242 4242 4242` (exp any future date, CVC any 3 digits).
2. Confirm a `201` response and a new `User` + `Transaction` row appear in the DB.
3. Use 3DS test card `4000 0025 0000 3155` — confirm the client renders the Stripe authentication modal and the subscription becomes `active` after confirmation.
4. Use declined card `4000 0000 0000 9995` — confirm a `402` error with a user-friendly message appears in the form.

### Manual UI Checks
1. Project cards display **no** progress bar or raised amount.
2. Clicking a card expands it smoothly; clicking again collapses it. Tab + Enter works.
3. "Donation Tiers" and "Total Donation Objectives" sections appear below the donation grid both **with** the API running and **without** (kill the server, reload — fallback data must render).
