# Implementation Plan — Add Tier Perks to Webhook PDF Receipts

We are updating the Stripe webhook handler so that the attached PDF receipts and the transaction receipt emails dispatched via real payments contain the donor's full metadata (Name, Email, Country) and active subscription tier perks/benefits, matching the mock checkout email experience.

---

## Proposed Changes

### 1. Backend Webhook Route Upgrade

#### [MODIFY] [webhooks.js](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/src/routes/webhooks.js)
- Update `invoice.payment_succeeded` event handler to fetch the donor's tier and perks dynamically from the SQLite `tier` table using the payment amount or the user's configured `monthlyAmount`.
- Populate `receiptData` in `sendEmail` with complete user details and resolved active tier parameters:
  * `donorName`: Full compiled name of the donor.
  * `donorEmail`: Registered user email.
  * `country`: Registered billing country.
  * `tierName`: Matches active tier (Regular, Shareholder, Patron).
  * `tierPerks`: Unlocked perks array mapping benefits inside the PDF.

---

## Verification Plan

### Automated Verification
- Execute `node server/src/functions/testTrigger.js` to ensure the transactional trigger logic compiles and executes without issues.

### Manual Verification
- Simulate/trigger a mock Stripe transaction or a manual donation.
- Inspect the generated transaction receipt and confirm the "TIER BENEFITS ACTIVATED" section renders all perks beautifully inside both the email template and the attached receipt PDF.
