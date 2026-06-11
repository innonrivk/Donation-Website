# Active Projects CRUD — Final Implementation Plan (v2)

Adds full Create, Read, Update, Delete management for `ProjectDetail` records to the admin dashboard. This plan incorporates all decisions from the architectural review and `/grill-me` session.

---

## Confirmed Design Decisions

| Topic | Decision |
|---|---|
| **List View Layout** | Card grid (matching CMSDonationBoxes visual style) |
| **Form Presentation** | Inline panel replacing the card grid (same page, matching CMS pattern) |
| **Data Fetching** | TanStack React Query (`useQuery` + `useMutation`) — existing project standard |
| **Delete Dialog** | Custom Framer Motion `<ConfirmDeleteModal>` — reusable, shared across all CMS modules |
| **Modal Retrofit** | CMSMilestones and CMSDonationBoxes will be updated to use the new shared modal |
| **imageUrl** | Excluded from form for this sprint — future feature |
| **Funding Fields** | Excluded — funding allocation is managed at the NGO level, not here |
| **Form Fields** | `projectName`, `details` (rich text / markdown), `status` (ACTIVE \| INACTIVE), `startDate` |

---

## Architectural Blind Spots Resolved

> [!NOTE]
> These were identified during the senior architect review and are now addressed in the plan below.

- **Auth Middleware**: `requireAdminAuth` is already applied at the admin router index level (`router.use('/projects', requireAdminAuth, projectRoutes)`). No changes needed.
- **Zod Schema Split**: The existing `ProjectDetailSchema` requires `fundingGoal`. Since we are removing it from the form, we will use `z.partial()` on the `update` path to prevent validation failures from omitted fields.
- **Empty State**: Explicitly planned — if no projects exist, show a helpful empty state UI.
- **Delete Cascade**: Already handled safely in `deleteProject` via a Prisma `$transaction` (votes → piggyBanks → project). No changes needed.

---

## Phase 1 — Database Schema

### [MODIFY] [schema.prisma](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/prisma/schema.prisma)

**Add `startDate` to `ProjectDetail`:**
```prisma
model ProjectDetail {
  // ... existing fields ...
  startDate    DateTime      @default(now()) @map("start_date")
}
```

**Action Required After Edit:** Run `npx prisma db push` to sync the SQLite schema.

---

## Phase 2 — Backend API

### [MODIFY] [adminProjectController.js](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/server/src/controllers/admin/adminProjectController.js)

**Changes:**
1. Add `startDate: z.string().datetime().optional()` to `ProjectDetailSchema`.
2. Remove `fundingGoal` and `fundedAmount` from the schema since they are not managed through this UI.
3. Create a `ProjectUpdateSchema = ProjectDetailSchema.partial()` to safely handle partial PUT payloads and prevent validation failures from omitted fields.
4. Update `createProject` and `updateProject` handlers to use the correct schema variant.

> [!NOTE]
> No new routes are required — GET, POST, PUT, DELETE for `/admin/projects` are already fully wired in `projects.js` and protected by `requireAdminAuth`.

---

## Phase 3 — Frontend UI

### [NEW] `components/ui/ConfirmDeleteModal.jsx`
A reusable, animated delete confirmation modal built with Framer Motion.

**Props:**
- `isOpen: boolean` — controls visibility
- `onConfirm: () => void` — fires the delete mutation
- `onCancel: () => void` — closes the modal
- `title: string` — e.g., "Delete Project"
- `message: string` — descriptive warning, e.g., "This will permanently remove **Beach Cleanup** and all related voting data."
- `isLoading: boolean` — disables the confirm button and shows a spinner during deletion

**Behavior:** Renders a centered overlay with an animated slide-in card, red danger button, cancel button, and a Framer Motion `AnimatePresence` exit transition.

---

### [NEW] `components/ui/ConfirmDeleteModal.css`
Scoped styles for the modal overlay, card, action buttons, and animations.

---

### [MODIFY] [CMSMilestones.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/admin/CMSMilestones.jsx)
- Import and use `<ConfirmDeleteModal>` in place of the existing `window.confirm()` call in the delete handler.

### [MODIFY] [CMSDonationBoxes.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/admin/CMSDonationBoxes.jsx)
- Import and use `<ConfirmDeleteModal>` in place of the existing `window.confirm()` call in `handleDelete`.

---

### [NEW] `components/admin/CMSProjects.jsx`
Core Projects CRUD component. Structure mirrors `CMSDonationBoxes.jsx`.

**State:**
- `editingProject: object | null` — the project currently being edited
- `isFormOpen: boolean` — toggles between card grid and inline form
- `deleteTarget: object | null` — the project staged for deletion (passed to modal)
- `apiError: string` — inline form error banner

**Data Fetching (React Query):**
- `useQuery({ queryKey: ['admin-projects'] })` — fetches all projects via `adminApi.get('/projects')`
- `saveMutation` (`useMutation`) — POST for create, PUT for update. `onSuccess` calls `queryClient.invalidateQueries(['admin-projects'])` then closes the form.
- `deleteMutation` (`useMutation`) — DELETE by ID. `onSuccess` invalidates query and clears `deleteTarget`.

**Form Fields (react-hook-form + Zod):**
| Field | Input Type | Validation |
|---|---|---|
| Project Name | `text` | Required, min 1 char |
| Details / Description | `textarea` (markdown) | Optional |
| Status | `select` (ACTIVE / INACTIVE) | Required, enum |
| Start Date | `date` | Required |

**Empty State:** If `projects.length === 0`, render an empty state panel with an icon, message ("No active projects yet"), and a "+ Add First Project" CTA button.

**Loading State:** `if (isLoading) return <div className="admin-loading">Loading projects...</div>;`

**Delete Flow:**
1. Admin clicks "Delete" on a card → sets `deleteTarget` to that project.
2. `<ConfirmDeleteModal>` renders with the project name in the message.
3. On confirm → `deleteMutation.mutate(deleteTarget.id)`.
4. On cancel → clears `deleteTarget`.

---

### [NEW] `components/admin/CMSProjects.css`
Scoped styles consistent with other CMS modules. Uses existing CSS variables from the design system (`--brand-green`, `--brand-blue`, glassmorphism `.glass` class, etc.). Each project card shows the project name, status badge, start date, and action buttons.

---

### [MODIFY] [AdminSidebar.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/components/admin/AdminSidebar.jsx)
Add nav item:
```js
{ label: 'Projects', path: '/admin/dashboard/projects', icon: '📂' },
```

### [MODIFY] [AdminDashboardPage.jsx](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/client/src/pages/AdminDashboardPage.jsx)
Import `CMSProjects` and register:
```jsx
<Route path="/projects" element={<CMSProjects />} />
```

---

## Verification Plan

### Automated
- Prisma type safety validates schema integrity at compile time.

### Manual Checklist
- [ ] `npx prisma db push` runs without error after schema update.
- [ ] Navigate to `/admin/dashboard/projects` — sidebar item is active.
- [ ] Empty state is visible when no projects exist.
- [ ] Click "+ Add Project", fill form, submit — new card appears in grid.
- [ ] Click "Edit" on a card — form pre-fills correctly, update saves.
- [ ] Click "Delete" — custom Framer Motion modal appears with project name in message.
- [ ] Confirm delete — project removed from grid without page reload.
- [ ] Cancel delete — modal closes, project remains.
- [ ] Visit CMSMilestones and CMSDonationBoxes — their delete flows now use the shared modal.
- [ ] Verify no regressions on other CMS modules.
