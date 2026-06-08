# Frontend Implementation Review & Optimizations

This document provides a critical review of the Frontend Implementation Plan, focusing on state management, security, and accessibility (a11y) optimizations.

---

## 1. State Management & Bundle Performance

### The `useCMS()` Re-render Hazard
**Critique:** While fetching the monolithic payload via a single React Query is excellent for network performance, exposing it via a single `useCMS()` hook without selectors is a massive anti-pattern. If a component only needs `WebsiteContent`, it will still re-render if an admin updates a `DonationMilestone`.
**Actionable Fix:** 
- Implement **TanStack Query's `select`** option within the hook to subscribe to specific data slices. 
- Example: `const { data: tiers } = useCMS({ select: (data) => data.tiers });`. This ensures components only re-render when their specific data slice changes.

### Bundle-Size Bloat & Lazy Loading
**Critique:** Bringing in `@tiptap/react`, `react-hook-form`, `zod`, and `framer-motion` simultaneously will bloat the initial JavaScript payload. The public view should not be downloading TipTap or Zod.
**Actionable Fix:**
- Use **`React.lazy()`** and `<Suspense>` at the routing layer to aggressively code-split the entire `/admin` namespace.
- Configure Vite's `rollupOptions.output.manualChunks` in `vite.config.ts` to isolate heavy admin dependencies (`@tiptap`, `zod`, `react-hook-form`) into an `admin-vendor.js` chunk that is never loaded by public visitors.

---

## 2. Security & Authentication Flow

### Axios 401 Interceptor Race Conditions
**Critique:** In a dashboard environment, multiple API requests often fire in parallel. If a session expires, 4 parallel requests will yield 4 simultaneous `401` responses. This will trigger the Axios interceptor 4 times, resulting in overlapping "Session Expired" toasts and race conditions on the router redirect.
**Actionable Fix:**
- Implement a global lock flag (e.g., `let isRefreshing = false;`) inside the Axios interceptor file.
- When the first 401 hits, set the lock to `true`, trigger the toast, and fire the redirect. Subsequent 401s should check the lock and silently abort or queue their promises until the auth state is resolved.

### JWT Storage Strategy (XSS vs. CSRF)
**Critique:** The backend returns the JWT in the response body. Storing this in `localStorage` makes the application highly vulnerable to Cross-Site Scripting (XSS) — if an attacker injects a script, they can steal the admin token. 
**Actionable Fix:**
- **Best Practice:** Store the short-lived JWT purely in **React state/memory** (e.g., a Zustand store or Context). It is immune to CSRF and inaccessible to XSS. 
- **Persistence:** To handle page refreshes, you must rely on the backend issuing an `HttpOnly` refresh cookie. The frontend should hit an `/api/v1/admin/auth/refresh` endpoint on the initial load to hydrate the in-memory JWT. (If the backend does not support this, `localStorage` is the fallback, but XSS sanitization becomes life-or-death).

---

## 3. Form Architecture & Accessibility (a11y)

### Dynamic `useFieldArray` Navigation
**Critique:** Dynamically adding/removing fields (like `Tier.perks`) is notoriously hostile to screen readers and keyboard users if not managed correctly.
**Actionable Fix:**
- **Focus Management:** When an admin clicks "Add Perk", programmatically move focus to the newly appended input using a React `ref`.
- **Live Regions:** Wrap the list of perks in an `aria-live="polite"` container so additions and removals are announced by screen readers.
- **Descriptive Labels:** The remove buttons must not just say "Remove" or use an icon. They must have specific `aria-label` attributes (e.g., `aria-label={\`Remove perk \${index + 1}\`}`).

### TipTap XSS Sanitization
**Critique:** TipTap outputs raw HTML strings. If we render `WebsiteContent.body` on the public view using React's `dangerouslySetInnerHTML`, we are opening an XSS vector. Even if the backend proxy blocks public writes, a compromised admin account could inject malicious scripts into the homepage.
**Actionable Fix:**
- **Mandatory DOMPurify:** You must install **`dompurify`** and strictly sanitize the HTML string *immediately* before rendering it on the public site. 
- Example: `<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.body) }} />`
- Do not rely solely on TipTap's internal sanitization; a final pass on the consumer side is a non-negotiable defense-in-depth measure.
