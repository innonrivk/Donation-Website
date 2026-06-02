# Implementation Review — Add Webhook Perks

This document provides a technical review and additional recommendations for [implementation_plan.md](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/implamention%20plans/implementation_plan.md) and [plan_suggestions.md](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/implamention%20plans/plan_suggestions.md).

---

## 🛠️ Suggestions & Additional Revisions

### 1. Optimize Stripe Response Latency (Non-blocking Webhook)
Stripe expects webhook endpoints to respond within a **few seconds**. Fetching details, compiling a PDF in memory, and executing a Nodemailer SMTP transfer synchronously inside `invoice.payment_succeeded` can easily exceed Stripe's timeout window under load.

**Recommendation**: Execute the database fetches, PDF generation, and SMTP transfers inside a background worker or non-blocking async wrapper (similar to the 100ms `setTimeout` inside `prismaEmailTrigger.js`). This allows the HTTP router to reply `200 OK` to Stripe immediately, executing the compilation and delivery in the background.

```javascript
// Acknowledge Stripe webhook instantly
res.json({ received: true });

// Execute heavy logic in background
setTimeout(async () => {
  try {
    // DB Queries, PDF Generation, and Email Dispatch here
  } catch (err) {
    console.error('Background Webhook Email Dispatch Failed:', err);
  }
}, 50);
```

---

### 2. Safeguard Against Missing `monthlyAmount` on Stripe Invoices
Sometimes a Stripe webhook invoice succeeds, but the database user record has not been updated with the correct `monthlyAmount` yet (due to race conditions or asynchronous synchronization). 

**Recommendation**: Ensure that the tier calculation defaults directly to the invoice `amountPaid` divided by 100 if the user's `monthlyAmount` is missing or is less than the current invoice payment.

```javascript
const finalAmount = Math.max(user.monthlyAmount || 0, amountPaid);
const amountDollars = Math.floor(finalAmount / 100);
```

---

### 3. Graceful Fallback if SQLite Connection is Locked
SQLite is a single-writer database and may return `SQLITE_BUSY` under high transaction load (e.g. concurrent webhook hits). If the `prisma.tier` query fails, the code should fall back gracefully to the basic "Regular" tier instead of crashing the email delivery entirely.

**Recommendation**: Wrap the database read inside a clean try/catch with predefined fallback values:
```javascript
let tierName = 'Regular';
let tierPerks = [
  'Monthly updates from our newsletter',
  'Invitation to "OMP\'s yearly impact" yearly zoom event'
];
```

---

### 4. Code Quality & Formatting Checks
Confirm that all strings extracted from SQLite JSON strings parse safely. SQLite stores tier perks as a stringified JSON array. If parsing throws an error, default `tierPerks` to a safe empty array `[]` rather than throwing a runtime error.

```javascript
tierPerks = Array.isArray(tier.perks) ? tier.perks : JSON.parse(tier.perks || '[]');
```
This is already implemented and proven to be robust.
