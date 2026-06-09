# Implementation Plan: Admin Settings & Custom Copy Formatting

This plan details the design and architecture to:
1. Allow portal administrators to update their email and password from the Admin Settings, secured by OTP.
2. Remove the old "Website Text" tab and mount the new "Site Copy" page at the dashboard root (`/admin/dashboard`).
3. Replace the `ReactMarkdown` parser with a custom, lightweight text formatting utility to support **Blue/Teal gradient**, **Gold gradient**, **standard bold**, and **underline** options on layout headlines and descriptions.

---

## Proposed Changes

### Phase 1: Sidebar & Route Re-organization

#### [MODIFY] [AdminSidebar.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/admin/AdminSidebar.jsx)
- Remove the old "Website Text" navigation item (path `/admin/dashboard` linked to `CMSWebsiteContent`).
- Rename "Site Copy (New)" to "Manage Site Copy" and change its path to the root admin path `/admin/dashboard`.
- Add "Admin Settings" navigation link pointing to `/admin/dashboard/settings` with a gear icon `⚙️`.

#### [MODIFY] [AdminDashboardPage.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/pages/AdminDashboardPage.jsx)
- Remove the import and routing for the old `CMSWebsiteContent` component.
- Mount the new `EditContentPage` at the dashboard root (`/` route under `/admin/dashboard/*`).
- Mount `<Route path="/settings" element={<AdminSettingsPage />} />` under `/admin/dashboard/*`.

---

### Phase 2: Custom Copy Formatting Utility (CSS & JS)

#### [NEW] [formatContent.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/utils/formatContent.jsx)
Implement a lightweight React utility `formatContent(text)` to parse custom formatting markers:
- `**Text**` -> Primary Blue/Teal Gradient: `<span className="gradient-text">Text</span>`
- `$$Text$$` -> Gold Gradient: `<span className="gradient-gold">Text</span>`
- `*Text*` -> Standard Bold: `<strong className="bold-text">Text</strong>`
- `__Text__` -> Underline: `<span className="underline-text">Text</span>`
- Supports line breaks `\n` and paragraph breaks `\n\n` natively without external parser dependencies.

#### [MODIFY] [index.css](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/index.css)
Add styling classes for the new formatting markers in global CSS:
- `.gradient-gold`: Gold gradient text overlay using `--brand-yellow` gradient steps.
- `.underline-text`: Text decoration underline with styled text offset.
- `.bold-text`: Explicit `font-weight: 700`.

#### [MODIFY] Landing Page Components
Replace `<ReactMarkdown>` blocks with `{formatContent(useContent(...))}` in:
- [HeroSection.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/layout/HeroSection.jsx)
- [DonationPage.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/pages/DonationPage.jsx)
- [ProjectsSection.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/donation/ProjectsSection.jsx)
- [DonationGrid.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/donation/DonationGrid.jsx)
- [DonationProgramDetails.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/donation/DonationProgramDetails.jsx)

#### [MODIFY] [EditContentPage.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/pages/admin/EditContentPage.jsx)
- Update field descriptions in `FIELDS_BY_SECTION` to explain the availability of primary gradient (`**`), gold gradient (`$$`), standard bold (`*`), and underline (`__`) markers.
- Update `MarkdownHelper` component sidebar guide to showcase all four formatting tokens and their rendered output.

---

### Phase 3: Admin Auth Context & Settings UI

#### [MODIFY] [AdminAuthContext.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/context/AdminAuthContext.jsx)
Introduce `updateAdminState` to the context state value so settings updates dynamically rotate in-memory admin details (JWT token and profile metadata) without causing session interruptions.

#### [NEW] [AdminSettingsPage.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/pages/admin/AdminSettingsPage.jsx)
Build a settings panel dashboard for credentials:
- Accordion transitions using `framer-motion`.
- Change Password form with step-based flow (Send OTP code -> Verify and update password).
- Change Email form with validation (Enter new email -> Send OTP -> Confirm and rotate).
- Action loaders and dynamic validation error messages.

#### [NEW] [AdminSettingsPage.css](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/pages/admin/AdminSettingsPage.css)
Style rules utilizing global variables, shadows, transitions, and hover effects matching the Google light brand theme.

---

### Phase 4: Backend Settings Controllers & Routes

#### [MODIFY] [adminAuthController.js](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/src/controllers/admin/adminAuthController.js)
Write four settings controllers:
- `requestPasswordOtp`: Sends OTP code to current email for password change.
- `changePassword`: Compares OTP and writes hashed new password.
- `requestEmailOtp`: Validates new email uniqueness, dispatches OTP.
- `changeEmail`: Validates OTP, updates email in db, rotates JWT tokens.

#### [MODIFY] [auth.js](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/src/routes/admin/auth.js)
Mount the routes under the `/auth` router protected by the `requireAdminAuth` middleware.

---

## Verification Plan

### Automated Verification
- Verify that standard unit and integration test suites run successfully using `npm test`.

### Manual Verification
1. Open the Admin Dashboard: verify the old "Website Text" link is gone, and root dashboard URL `/admin/dashboard` directly loads the new copy manager.
2. Edit welcome headline to include: `**Primary**`, `$$Gold$$`, `*Bold*`, and `__Underline__`. Save edits.
3. Open the landing page: verify the layout renders correct styles (gradient highlights, bold text, underlines) without shift or rendering errors.
4. Open Admin Settings: test password and email rotations via OTP codes, confirming profile updates without session failure.
