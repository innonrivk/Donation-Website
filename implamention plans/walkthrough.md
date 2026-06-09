# Walkthrough: Admin Settings & Custom Copy Formatting

This document walks you through the implementation of the Admin settings page, the re-organization of the admin sidebar routes, and the custom text copy formatting utility.

---

## 🛠️ Changes Implemented

### 1. Sidebar & Routing Re-organization
* **[AdminSidebar.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/admin/AdminSidebar.jsx)**:
  * Removed the old "Website Text" page.
  * Mapped "Manage Site Copy" directly to the dashboard root route `/admin/dashboard` (instead of `/admin/dashboard/site-text`).
  * Registered the "Admin Settings" tab (`/admin/dashboard/settings` with a gear icon `⚙️`).
* **[AdminDashboardPage.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/pages/AdminDashboardPage.jsx)**:
  * Removed old `CMSWebsiteContent` component imports and routes.
  * Mounted `EditContentPage` at the dashboard root `/`.
  * Mounted `AdminSettingsPage` at `/settings`.

### 2. Custom Copy Formatting Utility (XSS Protected)
* **[formatContent.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/utils/formatContent.jsx)**:
  * Created a recursive string tag parser that parses formatting blocks into React elements (`<span>` and `<strong>`) natively without `innerHTML` / `rehype-raw`, ensuring complete stored XSS protection.
  * Supported syntax:
    * `**Text**` -> Primary Blue/Teal Gradient
    * `$$Text$$` -> Gold Gradient
    * `*Text*` -> Standard Bold
    * `__Text__` -> Underline
  * Exported `formatContent` for body block text (renders paragraphs `<p>` and breaks `<br />`) and `formatContentInline` for titles/headings (prevents block nesting violations).
* **[index.css](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/index.css)**:
  * Added CSS classes for `.gradient-gold`, `.underline-text`, and `.bold-text` mapping to design tokens.
* **Layout Integrations**:
  * Replaced `<ReactMarkdown>` with custom inline and block formats in:
    * `HeroSection.jsx`
    * `DonationPage.jsx`
    * `ProjectsSection.jsx`
    * `DonationGrid.jsx`
    * `DonationProgramDetails.jsx`
* **[EditContentPage.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/pages/admin/EditContentPage.jsx)**:
  * Updated input description hints.
  * Custom styled and updated the Formatting Guide sidebar to list all four tokens.

### 3. Admin Auth Context & Settings UI
* **[AdminAuthContext.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/context/AdminAuthContext.jsx)**:
  * Exposed `updateAdminState` to dynamically rotate in-memory access tokens and admin profiles on email change without session interruption.
* **[AdminSettingsPage.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/pages/admin/AdminSettingsPage.jsx)**:
  * Designed an accordion settings interface using `framer-motion` height transitions.
  * Built step-based email and password forms.
* **[AdminSettingsPage.css](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/pages/admin/AdminSettingsPage.css)**:
  * Designed accordion cards, borders, input outlines, and loading spinners matching the Google light brand style.

### 4. Express Backend OTP Auth Settings Routes
* **[adminSettingsController.js](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/src/controllers/admin/adminSettingsController.js)**:
  * Implemented secure endpoints: `requestPasswordOtp`, `changePassword`, `requestEmailOtp`, and `changeEmail`.
  * Configured a brute-force block: OTP entries are locked and deleted upon hitting 5 failed attempts.
  * Updated emails will sign and return new JWT access tokens and write HttpOnly refresh cookies.
* **[auth.js](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/src/routes/admin/auth.js)**:
  * Registered routes under `/auth` guarded by `requireAdminAuth`.

---

## 🚦 Verification & Validation

### 1. Test Suite Results
* Executed the Express test suite runner (`node tests/run.js`) after updating the fallback password in `tests/integration/api.test.js` to align with the new seeded password `12345678`:
  * **Unit Tests**: Pass ✅
  * **Integration Tests**: Pass ✅
  * **Edge-Case Tests**: Pass ✅
  * **Donation Tracks Tests**: Pass ✅
  * **Env Edge Tests**: Pass ✅
  * **Summary**: All test suites passed successfully!

### 2. Client Production Bundling
* Ran a production Vite build (`npm run build` inside `client/`):
  * **Result**: Clean build in **1.49s** with zero errors or warnings.

---

## 🧪 Step-by-Step Test Plan

### Step A: Verify Re-routed Sidebar
1. Log in to the Admin Dashboard (email: `admin@openmindprojects.org` / password: `12345678`).
2. Verify that:
   * The old "Website Text" link is gone.
   * Clicking "Manage Site Copy" takes you directly to the copy manager page at `/admin/dashboard`.
   * The sidebar lists "Admin Settings" with a gear icon `⚙️` pointing to `/admin/dashboard/settings`.

### Step B: Test Custom Formatting Tags
1. Under "Manage Site Copy", in the "Welcome Hero" tab:
   * Edit "Welcome Headline" to:
     `Empower **Communities**, Transform $$Lives$$`
   * Edit "Welcome Subheadline" to:
     `Your *monthly* donation creates lasting impact through sustainable projects worldwide...`
   * Save changes.
2. Visit the public Donation landing page:
   * Verify "Communities" renders in the primary Blue/Teal gradient.
   * Verify "Lives" renders in the new Gold gradient.
   * Verify "monthly" renders in standard Bold text.
   * Verify "lasting impact" renders with an Underline text decoration.
   * Verify no HTML nesting violations or rendering shifts occurred.

### Step C: Test Password Update Flow
1. Go to "Admin Settings".
2. Open the "🔐 Change Password" accordion.
3. Click "Request Code".
4. Check the backend server terminal output / logs to view the dispatched code:
   ```
   To:      admin@openmindprojects.org
   Subject: Reset Your OMP Admin Password
   Code:    XXXXXX
   ```
5. Input the code, enter a new password (e.g. `adminpasswordnew`), and repeat it.
6. Click "Confirm Password Update". Verify the success state.
7. Log out, and verify that you can successfully log back in using `adminpasswordnew`.

### Step D: Test Email Update Flow
1. Open the "📧 Change Email Address" accordion in Settings.
2. Enter a new email address (e.g. Sven's email).
3. Click "Request Code".
4. Check the terminal console log to get the 6-digit verification code.
5. Input the code and click "Confirm Email Update".
6. Verify the success state, that the sidebar displays the new email address, and that your session remains active (re-signed JWT in background).
7. Verify that you can refresh the page and remain authenticated.
