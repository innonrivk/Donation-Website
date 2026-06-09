# Implementation Review: Admin Settings & Custom Copy Formatting

This review evaluates the integrated design plan for admin settings updates and custom formatting tags, identifying opportunities to enhance security, performance, and user experience.

---

## 1. Custom Text Formatter (Security & Performance)
* **XSS Defense**: Translating formatting delimiters directly into React elements (e.g. `<span>` and `<strong>`) rather than parsing raw HTML strings with `innerHTML` / `rehype-raw` guarantees **out-of-the-box XSS protection**. Even though copy editing is restricted to admins, this prevents stored scripting injections.
* **Overlapping Delimiters & Edge Cases**: The regex splitting logic must safely handle combinations like `**text with $$gold$$ highlight**` or single unclosed markers (e.g. `*unclosed`). The sequential regex matcher behaves linearly without crash states, and unclosed tags safely degrade to plain text.
* **Bundle Optimization**: Replacing `ReactMarkdown` with a custom formatter eliminates package overhead on the main landing page, keeping the bundle lightweight.

---

## 2. Admin Router & Sidebar Redirection
* **Default Page Mounting**: Mapping the new `EditContentPage` directly to the dashboard root `/` under `/admin/dashboard/*` guarantees that direct bookmarks to `/admin/dashboard` resolve correctly, avoiding dead page resolution errors.

---

## 3. Session Synchronization & Token Lifecycle
* **Dynamic JWT Re-Issuance**: Email changes invalidate the active Bearer token email payload. The backend `/settings/change-email` endpoint will sign and return a new access token, alongside updating the secure HttpOnly `adminRefreshToken` cookie.
* **In-Memory Client Sync**: The client-side `AdminAuthContext` will expose an `updateAdminState` hook to refresh context variables in the background, avoiding session interruption.
* **Lockout Protection**: Restrict verification attempts on the OTP code to `5`. Delete the OTP record immediately on block to defend against brute force.
