# Implementation Plan — Project Descriptions, Mission Clean-up & Stripe Mocking

This implementation plan outlines the engineering steps to:
1. Ensure project descriptions expand fully to show 100% of their content.
2. Remove the specific OMP mission statement paragraph from the "Our Mission" section (both database seed and offline fallback).
3. Introduce a highly visual, fully trace-logged Stripe mock mode for frictionless local credit card processing and end-to-end request tracing.

---

## Proposed Changes

### 1. Fully-Expanding Project Description Cards

To prevent descriptions from being cut off, we will increase the collapsed-to-expanded transition boundaries in the stylesheet. Instead of clipping text at `280px` or using rigid boundaries, we will scale `max-height` to `1000px` (or `60em`), allowing the CSS grid items to grow dynamically to whatever height their inner content demands.

#### [MODIFY] [ProjectsSection.css](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/donation/ProjectsSection.css)
- Increase `.project-card--expanded .project-card__details-wrap` `max-height` from `280px` to `1000px`.
- Increase the media-query desktop hover state `.project-card:hover .project-card__details-wrap` `max-height` from `280px` to `1000px`.
- This ensures any description, regardless of length, is displayed completely without being cut off, while preserving the smooth transition.

---

### 2. "Our Mission" Paragraph Removal

As requested, we will remove the following paragraph:
> *OpenmindProjects (OMP) is dedicated to building stronger communities through sustainable development initiatives. Every donation directly funds projects in clean water access, education, environmental conservation, and community empowerment.*

To ensure consistency in both online database mode and offline demo fallback, we will update the description string in both layers:

#### [MODIFY] [DonationPage.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/pages/DonationPage.jsx)
- Update the `content.websiteContent.body` offline fallback string in the `catch` block of the page-load `useEffect` hook to exclude the first paragraph.
- The body will now start with: *"By becoming a monthly donor, you join a movement..."*

#### [MODIFY] [seed.js](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/prisma/seed.js)
- Update the `prisma.websiteContent.create` statement to remove the first paragraph from the seeded database content.

---

### 3. Credit Card Mocking & Step-by-Step Request Tracing

We will implement a premium **Mock Mode** for credit card donations. If Stripe is not loaded, the Stripe publishable key is missing, or the Stripe secret key is a placeholder (e.g. starts with `sk_test_placeholder`), the application will seamlessly process the donation using high-fidelity mock data and print incredibly rich trace logs tracing the journey from **Frontend Form** to **Backend Route** to **Stripe API Helper**.

#### [MODIFY] [StripeForm.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/checkout/StripeForm.jsx)
- Update `handleSubmit` to check if `stripe` or `elements` is not initialized, or if the Stripe initialization key is a placeholder.
- If so, bypass the standard `stripe.createPaymentMethod` call, print a clear debug log, and call `createSubscription` with a mock payment method ID `pm_mock_123`.
- Add gorgeous, highly readable console traces representing each step of the checkout submission:
  - **Submission start:** `console.log("┌── 💳 [FRONTEND] Checkout form submitted for $${amount}/mo")`
  - **PaymentMethod creation:** `console.log("├── 📦 [FRONTEND] Requesting PaymentMethod tokenization...")`
  - **Backend dispatch:** `console.log("├── 🌐 [FRONTEND] Dispatching POST /api/v1/donations/subscribe with:", ...)`

#### [MODIFY] [stripe.js](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/src/services/stripe.js)
- Remove the strict startup crash if `STRIPE_SECRET_KEY` is missing or is a placeholder. Instead, print a prominent warning log: `⚠️ [STRIPE SERVICE] Running in MOCK Mode`.
- Update the helper functions `upsertStripeCustomer`, `createStripeSubscription`, and `listActiveSubscriptions` to support Mock Mode:
  - If mock mode is active, print details directly (e.g. `├── 🔌 [STRIPE] (Mock) Creating new customer for user...`) and return high-fidelity mock objects matching standard Stripe structure (`cus_mock_123`, `sub_mock_123` active subscription, mock invoice and payment intent).

#### [MODIFY] [donations.js](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/src/routes/donations.js)
- Add comprehensive, trace-friendly print statements inside the route handler tracing the intake, validation, upserting, subscription logic, and database insertion steps.
  - **Intake:** `console.log("├── 📥 [BACKEND] Received subscribe request on /api/v1/donations/subscribe")`
  - **Validation:** `console.log("├── 🔎 [BACKEND] Input data validation succeeded:", ...)`
  - **Database Save:** `console.log("├── 💾 [BACKEND] Executing database transaction to upsert User...")`
  - **Response:** `console.log("└── 🎉 [BACKEND] Subscription successfully created! Returning response:", ...)`

---

## Verification Plan

### Automated & Build Verification
1. Validate client build: Run `npm run build` inside `client/` to verify React/Vite builds clean.
2. Validate server syntax: Run `npm run dev` to verify the Node server initializes and runs without throwing connection/import errors.

### Manual / Browser Verification
1. **Description Expansion Test:**
   - Open the web interface. Hover/tap a card with a long description.
   - Verify that the card expands fully to show all text without clipping, and shrinks back snappily when unhovered/collapsed.
2. **Mission Statement Test:**
   - Verify the "Our Mission" section. The paragraph about OMP's dedication to sustainable initiatives should be completely absent, starting directly with *"By becoming a monthly donor..."*
3. **Credit Card Mock Transaction Trace Test:**
   - Open Developer Console in Chrome/Firefox.
   - Trigger a donation checkout using the custom amount or any subscription tier.
   - Enter card details, click submit, and verify that the transaction completes successfully.
   - Inspect the Developer Console and the Node Server terminal logs. Verify that the complete, step-by-step trace output logs the entire lifecycle of the request from start to finish.
