# Implementation Plan — Authentication Upgrade & UI Refinements

This plan details the technical approach for implementing real Google Authentication, an active Emawwil OTP system (Nodemailer), and resolving weqwoutstanding UI issues (Carousel smoothness, Receipt PDF print fix, and Settings animation stripping).

---

## 🧠 Core Objectivesew

1. **Google OAuth 2.w0 Integration**: Replace mock Google login with actual `@react-oauth/google` frontend components and `google-auth-library` backend verification.
   - **Prisma Schema Update**: Add an optional `googleId` field to the `User` model to track Google-linked accounts.
2. **Email OTP via Nodemailer**: Replace console-logged mock OTPs with real emails sent to users during signup, password changes, and email changes.
   - **Local Development Fallback**: If SMTP configuration is missing or fails, automatically log the OTP code in the console with a bright warning box so development is never blocked.
3. **Credit Card Mock Mode**: Ensure Stripe payment processing remains in mock/test mode.
4. **UI Refinements**: 
   - **Active Projects Carousel**: Slow down carousel animations, add a hover-to-expand behavior on desktop (which collapses all cards when the mouse leaves the section entirely), and automatically close other cards when one expands.
   - **Donation Receipt PDF**: Fix the blank PDF download using a robust print-isolation CSS flattening map.
   - **Settings Page**: Remove double-loading and staggered entrance animations.

---

## Proposed Changes

### 1. Database & Environment Configuration

#### [MODIFY] `server/prisma/schema.prisma`
- Add an optional `googleId String? @unique @map("google_id")` field to the `User` model.
```prisma
model User {
  id                 String              @id @default(uuid())
  email              String              @unique
  password           String?
  googleId           String?             @unique @map("google_id")
  firstName          String              @map("first_name")
  lastName           String              @map("last_name")
  // ... rest of user model
}
```

#### [MODIFY] `server/.env` & `client/.env`
- Include the following configuration keys (with placeholder values and templates):
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here

# SMTP Configuration (Nodemailer)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@openmindprojects.org
```

---

### 2. Backend Authentication Upgrades

#### [NEW] Dependency Installation
- Run `npm install google-auth-library nodemailer` inside the `server/` directory.

#### [MODIFY] `server/src/routes/auth.js`
- **Nodemailer Transport Setup**:
  - Implement a helper to create the Nodemailer transport dynamically.
  - If SMTP configuration is incomplete or fails, fallback to logging the OTP in the console with an easily visible block.
- **OTP Helper Update**:
  - Update `createAndStoreOtp` to dispatch real HTML/text emails using the Nodemailer transport.
- **Google Token Verification (`POST /api/v1/auth/google`)**:
  - Use `google-auth-library`'s `OAuth2Client` to verify the incoming Google ID token (`credential`).
  - Extract `sub` (Google user ID), `email`, `given_name`, and `family_name`.
  - Look up the user by `googleId` or `email`.
  - Link standard/shadow accounts dynamically by setting the `googleId` if verified.

---

### 3. Frontend Authentication Upgrades

#### [NEW] Dependency Installation
- Run `npm install @react-oauth/google` in the `client/` directory.

#### [MODIFY] `client/src/main.jsx`
- Wrap the main application component tree inside `<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>`.

#### [MODIFY] `client/src/pages/LoginPage.jsx` & `client/src/pages/SignupPage.jsx`
- Replace mock Google buttons with the real Google Login components/hooks from `@react-oauth/google`.
- Send the received token back to `/api/v1/auth/google` for authentication.

---

### 4. Main Landing Page — Projects Carousel & Hover Behaviors

#### [MODIFY] `client/src/components/donation/ProjectsSection.jsx`
- Implement `onMouseEnter={() => handleCardHover(project.id)}` and `onMouseLeave={handleCardLeave}` handlers on each project card.
- Live check `window.matchMedia('(hover: hover)').matches` within the hover handlers to only enable hover expansions on desktop screens.
- On mouse leaving the entire projects grid/section container, reset `expandedId` to `null` to restore the default balanced layout.
- Ensure clicking on a different card automatically closes any currently expanded card.

#### [MODIFY] `client/src/components/donation/ProjectsSection.css`
- Change transition duration from `0.4s` to `0.7s` using a high-end ease-out timing curve `cubic-bezier(0.16, 1, 0.3, 1)` for an ultra-smooth glide.
- Remove `pointer-events: none` on siblings so neighboring cards can be hovered directly.
- Ensure sibling transition rates match the active expansion rates for perfect harmony.

---

### 5. Premium Donation Receipt — Print CSS Overhaul

#### [MODIFY] `client/public/print.css`
- Hide non-receipt page components (`.dashboard-nav`, `.modal__header`, `.print-hide`) using `display: none !important`.
- Flatten structural containers (`body`, `#root`, `.modal-overlay`, `.modal`) using standard static, transparent block layout styles to ensure content is fully printable.
- Strip browser headers/footers completely using `@page { margin: 10mm !important; }`.

---

### 6. User Dashboard — Settings Page Animation Removal

#### [MODIFY] `client/src/pages/SettingsPage.jsx` & `SettingsPage.css`
- Strip staggered entrance classes and delay triggers so the whole settings section loads instantly.
- Decouple the Danger Zone red pulse animation from entrance transitions so it runs immediately on mount.

---

## Verification Plan

### Automated Verification
1. Run database migrations to apply the `googleId` field: `npx prisma migrate dev --name add_google_id`.
2. Build frontend and backend production bundles: `npm run build` to verify clean compiles.

### Manual Verification
1. **Google Login / Signup**: Perform a full Google login, confirm successful account creation (or dynamic linking to a matching email), and verify the user session.
2. **Email OTP Verification**: Trigger signup and setting change OTPs. Check that an actual email is received (or check console logs if SMTP variables are not set, confirming the fallback logs correctly).
3. **Carousel Smoothness**: Hover over cards on a desktop. Verify the 0.7s glide transition and full auto-collapse of inactive siblings. Verify all cards collapse when leaving the section.
4. **Receipt PDF printing**: Verify Ctrl+P prints a clean, single-page receipt.
5. **Dashboard Settings**: Open the Settings tab; confirm it loads statically and instantly.
