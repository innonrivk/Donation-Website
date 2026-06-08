# OpenmindProjects CMS: Frontend Implementation Plan

This plan outlines the architecture and step-by-step implementation strategy for the frontend React application to seamlessly integrate with the new Monolithic CMS backend. It emphasizes security, strict validation, performance, and a robust developer experience using a modern React/TypeScript stack.

> [!IMPORTANT]
> **User Review Required**
> Please review the chosen libraries in Phase 1 and 3 (TanStack Query, Axios, React Hook Form, Zod, and TipTap). These will need to be installed as they are currently not in your `package.json`.

## Open Questions

1. **Rich Text Editor Choice:** I have recommended **TipTap** for the `WebsiteContent.body` editor as it outputs clean HTML and is highly customizable. Does this align with your preferences, or would you prefer a simpler drop-in like React-Quill?
2. **UI Framework/Styling:** You mentioned "Traditional CSS" in your global rules, but often admin dashboards use component libraries (like Radix UI primitives or simple Tailwind/CSS modules) for forms and toasts. We will stick to vanilla CSS with CSS Modules and Framer Motion for animations unless otherwise specified.
3. **TypeScript:** The prompt mentions TypeScript, but much of the backend is JS. We will implement the frontend utilizing JSDoc with strict type definitions (or `.ts/.tsx` if your Vite config supports it) to ensure type safety.

---

## Phase 1: State Management & Public View Consumption

**Objective:** Efficiently fetch, cache, and distribute the monolithic CMS configuration payload across the public site.

*   **Setup Axios Instance:** Create a dedicated, configured `axios` instance (`src/lib/api.js`) pointing to `/api/v1/public/content` and `/api/v1/admin/content`. This ensures base URLs and timeouts are centralized.
*   **Integrate TanStack Query (React Query):** Introduce `@tanstack/react-query` to handle caching, background refetching, and deduping of the monolithic public content payload.
*   **Global CMS Hook (`useCMS`):** Create a custom hook that wraps the React Query call to the public `content` endpoint.
    *   This hook will provide global access to `WebsiteContent`, `DonationBoxes` (with nested Tier perks), and `Milestones` without prop-drilling.
*   **Hydration & Loading States:** Implement a smooth, Framer Motion-powered skeleton loader or fade-in transition at the layout level to handle the initial `isLoading` state from React Query, preventing layout shifts and UI flashing.

---

## Phase 2: Admin Authentication Guard & Security Integrity

**Objective:** Secure the React Router administration dashboard and prevent cross-site request vulnerabilities.

*   **Protected Route Component (`<ProtectedRoute />`):** Create a layout wrapper for all `/admin/*` routes.
    *   It will check the current admin session state (stored in context/memory).
    *   If no valid session is found, it will safely redirect to `/admin/login` using React Router's `Navigate`.
*   **Axios Security Interceptors:**
    *   Configure an interceptor on the admin Axios instance to automatically attach the `Authorization: Bearer <token>` header to all outbound requests.
    *   Include standard CSRF/security headers (e.g., `X-Requested-With: XMLHttpRequest`).
*   **Session Persistence & Expiry Handling:**
    *   Implement an Axios response interceptor that listens for `401 Unauthorized` responses (specifically checking for expired tokens).
    *   Upon detecting an expired session, the interceptor will clear the local session state and route the user back to the login interface with a "Session Expired" toast notification.

---

## Phase 3: Dynamic Forms & Strict Client-Side Validation

**Objective:** Build robust, user-friendly editorial interfaces for managing site text and configurations.

*   **React Hook Form Integration:** Utilize `react-hook-form` to manage complex form states (especially for Tiers and Donation Boxes) without triggering unnecessary re-renders.
*   **Zod Client-Side Validation:**
    *   Install `zod` and `@hookform/resolvers/zod`.
    *   Mirror the backend schemas (`WebsiteContentSchema`, `DonationBoxSchema`, etc.) on the frontend.
    *   This ensures that formatting errors (e.g., negative amounts, missing titles) are caught instantly *before* API flight.
*   **Rich Text Editor (TipTap):**
    *   Implement **TipTap** for editing `WebsiteContent.body`. It provides a headless architecture, allowing us to style the toolbar to match the OpenmindProjects brand guide perfectly.
*   **Dynamic Array Fields (`Tier.perks`):**
    *   Use React Hook Form's `useFieldArray` to allow admins to dynamically add, remove, and reorder perks within a Tier configuration seamlessly.

---

## Phase 4: API Resilience, Error Mapping & Optimistic UI Updates

**Objective:** Provide a seamless, descriptive user experience when saving content or encountering network blocks.

*   **Global Error Mapper:**
    *   Create a utility that catches Axios `error.response.data` and translates it into UI-friendly actions.
    *   Map `400 Validation Error` (with Zod field details) directly back to `react-hook-form`'s `setError` function to highlight specific inputs.
*   **Conflict Resolution (409):**
    *   Specifically handle the `409 Conflict` (Prisma `P2002`) we implemented on the backend. If an admin tries to create a duplicate Tier or Box, trigger an actionable toast alert explaining the conflict.
*   **Visual Feedback & Spinners:**
    *   Tie form submission buttons to React Hook Form's `isSubmitting` state to show inline spinners and disable double-clicks.
    *   Use React Query's `useMutation` for admin writes, leveraging `onSuccess` to invalidate queries and trigger positive, branded toast notifications.
    *   Apply subtle Framer Motion transitions to success/error state changes to make the interface feel responsive and premium.

---

## Verification Plan

### Automated/Structural Verification
- Verify all required libraries (`axios`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@tiptap/react`) are successfully installed.
- Verify the Axios interceptors correctly attach the Bearer token to admin routes and catch 401s.

### Manual Verification
1.  **Public Payload:** Load the public homepage and verify the monolithic payload is fetched once, cached by React Query, and distributed via `useCMS()` without layout shift.
2.  **Admin Routing:** Attempt to navigate to `/admin/dashboard` while logged out and verify the redirect to `/admin/login`.
3.  **Validation:** In the Admin Dashboard, try to submit a Donation Box with a negative amount and verify the Zod client-side error appears instantly.
4.  **Error Handling:** Force a backend 409 Conflict (e.g., duplicate title if constrained) and verify the UI catches it gracefully with a Toast notification rather than crashing.
