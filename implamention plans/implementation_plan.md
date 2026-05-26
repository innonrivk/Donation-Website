# Implementation Plan — Custom Test Cards, Dashboard Updates, and Rate Limiting Fixes

This plan outlines the design and proposed changes to allow the `"0000 0000 0000 0000 11/30 000"` mock credit card to go through easily, simplify the unsubscribed user dashboard with a single "Change Total Amount" custom card listing the tiers below it, and disable rate limit blocks in development mode to prevent the "Too many requests" login failures.

---

## User Review Required

> [!NOTE]
> **1. Auto-activating Mock Mode on Default Env Keys**
> - **Problem**: The project's default `.env` files contain standard keys like `sk_test_replace_with_your_key` and `pk_test_replace_with_your_key`. Since they do not match `_placeholder`, the system defaults to real Stripe mode and errors out.
> - **Solution**: We will update the mock detector on both frontend and backend to treat any key containing `"replace_with_your_key"` as mock mode. This will automatically activate the mock mode cleanly out-of-the-box for you.

> [!TIP]
> **2. Prefilled Card "0000 0000 0000 0000 11/30 000"**
> - We will update the default pre-filled credentials in `StripeForm.jsx` to exactly match your custom test credentials: Card `0000 0000 0000 0000`, Expiry `11/30`, and CVC `000`.

> [!WARNING]
> **3. Simplified Dashboard Custom Card for Unsubscribed Donors**
> - If a user is unsubscribed (`monthlyAmount === 0`), we will replace the tiered donation boxes with a single beautiful **"Change Total Amount"** custom donation card.
> - Clicking the button will launch the `CheckoutModal` pre-populated with their custom input amount.
> - Directly underneath the card, we will render a clean, premium visual description of the available tiers (**Regular**: $1-$84/mo, **Shareholder**: $85-$169/mo, **Patron**: $170+/mo).

> [!TIP]
> **4. Premium Real-time Validation Feedbacks**
> - In mock credit card inputs, display real-time active glow states (such as turning borders to emerald green and adding an inner shadow) as soon as the user enters a valid 16-digit card number, valid MM/YY pattern, or 3-digit CVC.
> - **Why**: Gives a beautiful, state-of-the-art interactive feedback that emulates premium digital wallet input states!

---

## Open Questions

All major questions have been successfully aligned through `/grill-me`:
* **Database Preference**: SQLite is kept for local development to maintain out-of-the-box operation, while PostgreSQL is supported and documented for production settings.
* **Custom Card Action**: Submitting the custom card opens the Stripe checkout modal with the prefilled amount.
* **Prefill Defaults**: The custom credentials `"0000 0000 0000 0000 11/30 000"` will be set as the standard pre-filled defaults.

---

## Proposed Changes

### 1. Backend Server Component

#### [MODIFY] [stripe.js](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/src/services/stripe.js)
* Update `isMockMode` detection to check if the secret key contains `"replace_with_your_key"`.
```javascript
export const isMockMode = stripeKey.startsWith('sk_test_placeholder') || stripeKey.includes('replace_with_your_key');
```

#### [MODIFY] [index.js](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/src/index.js)
* Update `authLimiter` and `donationLimiter` rate limit settings to disable active rate limiting when `process.env.NODE_ENV !== 'production'`.
```javascript
max: process.env.NODE_ENV === 'production' ? 10 : 999999
```

---

### 2. Frontend User Dashboard & Checkout

#### [MODIFY] [StripeForm.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/checkout/StripeForm.jsx)
* Update `isMockStripe` detection to checks for `"replace_with_your_key"`.
* Prefill `mockCard` state with `"0000 0000 0000 0000"`, `mockExpiry` with `"11/30"`, and `mockCvc` with `"000"`.
* Add real-time active glow states: when inputs reach their validated states (16 digits card, valid MM/YY, and 3 digits CVC), update the border color to `#34a853` (emerald green) and add a subtle glowing focus ring.

#### [MODIFY] [DashboardPage.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/pages/DashboardPage.jsx)
* If `monthlyAmount === 0`:
  * Render a single custom card with a numeric input field, styled beautifully.
  * Clearly display the label `"Change Total Amount"` and description `"The amount you enter here is your new monthly total amount."`
  * Clicking "Change Total Amount" pre-fills `CheckoutModal` and launches checkout.
  * Below the card, render a styled summary table or layout highlighting the donation tiers and active perks.

---

## Verification Plan

### Automated Tests
* Run `npm run build` in the `client/` directory to ensure perfect compilation.

### Manual Verification
1. **Rate Limiting**: Hit authentication endpoints (`/login`, `/signup`) multiple times consecutively to confirm no `429 Too Many Requests` block is triggered.
2. **Dashboard Card**: Log in with an unsubscribed account and verify the presence of the single Custom Card and the list of tiers.
3. **Transaction Test**: Enter custom amount -> click "Change Total Amount" -> verify pre-filled card details are `0000 0000 0000 0000 11/30 000` -> click "Donate" -> verify the transaction succeeds and user dashboard updates to the new tier.
