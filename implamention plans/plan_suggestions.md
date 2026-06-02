# Plan Suggestions — Add Tier Perks to Webhook PDF Receipts

> Suggestions and improvements for [implementation_plan.md](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/implamention%20plans/implementation_plan.md)

---

## ✅ What the Plan Gets Right
- Identifies the exact route file `webhooks.js` and the event handler `invoice.payment_succeeded` where the metadata is missing.
- Re-uses database logic that aligns perfectly with the prisma triggers in `prismaEmailTrigger.js`.

---

## 🔴 Critical Additions (Missing from Current Plan)

### 1. Robust Null-Safety Guard for `donorName`
When Stripe webhooks are triggered, the user profile might not contain a `firstName` or `lastName` yet (especially if it was a fast checkout). The name parsing needs to gracefully fall back to "Valued Donor" so that we don't have empty name spaces or `null` prints.

**Suggestion**: Implement strict fallback:
```javascript
const donorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Donor';
```

### 2. Handle Division by 100 for Stripe `amount_paid`
Stripe invoice `amount_paid` is in **cents** (e.g. 8500 cents). The `minAmount` and `maxAmount` columns in our `tier` table are stored in **dollars** (e.g. 85 dollars). We must divide the cents amount by 100 before querying the database to prevent failing to resolve the tier tier.

**Suggestion**: Divide Stripe amount by 100 to get dollar values:
```javascript
const amountDollars = Math.floor((user.monthlyAmount || amountPaid) / 100);
```
