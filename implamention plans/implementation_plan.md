# Donation Box & Tier Perk Synchronization — Implementation Plan

Provides a robust architecture for optionally linking Donation Boxes to Tiers, ensuring perks are dynamically inherited, preventing data duplication, and providing clear Admin UI state management.

---

## Confirmed Design Decisions (from /grill-me)

| # | Decision | Answer |
|---|---|---|
| 1 | Migrate existing pipe-delimited `tierDetails` to new `perks` JSON array | ✅ Auto-migrate via seeding script |
| 2 | Rename "Card Highlight Subtext" label in Admin UI | ✅ Rename to "Subtext" (DB column unchanged) |
| 3 | Perk input style | ✅ Tag-style chip input (type + Enter to add) |
| 4 | Tier-linked perk display in form | ✅ Read-only chip list (same visual style, no edit) |
| 5 | Detaching a Tier clears standalone perks | ✅ Box becomes empty; admin must re-enter perks |
| 6 | Reuse chip component in CMSTiers | ✅ Replaces the row-list input in CMSTiers too |
| 7 | Tier deletion warning | ✅ Show cascading impact warning listing linked boxes |
| 8 | Show perks on admin card list view | ✅ YES — list them|

---

## Proposed Changes

### Layer 0 — Database Schema

#### [MODIFY] `server/prisma/schema.prisma`
- Add `perks Json @default("[]")` to the `DonationBox` model.
- The existing `tierId Int?` relation remains **strictly optional** — no breaking changes for existing standalone boxes.

```prisma
model DonationBox {
  // ...existing fields...
  perks     Json    @default("[]")
  // ...
}
```

#### Migration Script (`server/prisma/seed.js`)
- After `npx prisma db push`, run a one-time migration step:
  - For each existing `DonationBox` where `tierId` is null and `tierDetails` contains `|`, parse the pipe-delimited string into a JSON array and write it to the new `perks` field.
  - Clear the pipe content from `tierDetails`, leaving it as descriptive subtext only.

---

### Layer 1 — Backend (Data Freshness & Validation)

#### [MODIFY] `server/src/lib/mapDonationBoxes.js`
- Update merge logic:
  - **Tier-linked box:** `box.perks` is strictly overridden by `box.tier.perks` (JSON parsed). The box's own `perks` field is ignored.
  - **Standalone box:** `box.perks` is used directly from the DB column (JSON array).
  - Remove all legacy pipe-delimited `tierDetails.split('|')` fallback logic.

#### [MODIFY] `server/src/controllers/admin/adminContentController.js`
- Update `DonationBoxSchema` (Zod) to accept `perks` as `z.array(z.string()).optional()`.

---

### Layer 2 — Shared UI Component (DRY)

#### [NEW] `client/src/components/ui/PerkChipInput.jsx`
- Accepts: `value: string[]`, `onChange: (chips: string[]) => void`, `disabled?: boolean`, `placeholder?: string`
- Behavior:
  - Type a perk string → press **Enter** or **Tab** → chip is added.
  - Click the `×` on a chip to remove it.
  - When `disabled={true}`, chips render in a visually distinct read-only style (no `×` button, muted color, lock icon).
- This component is **not connected to React Hook Form** directly — the parent provides `value` and `onChange` for maximum reusability.

---

### Layer 3 — Admin UI (State Management)

#### [MODIFY] `client/src/components/admin/CMSDonationBoxes.jsx`
- **Remove:** `tierDetails` as a perks source; Zod schema `tierDetails` stays for subtext only.
- **Add:** `perks` field (managed via `useState` alongside RHF, passed to `PerkChipInput`).
- **State Guard logic:**
  - Watch `tierId` with `useWatch`.
  - If `tierId` is set → `PerkChipInput` is `disabled={true}`, rendering the selected Tier's perks as a read-only chip list (fetched from the already-loaded `tiers` query).
  - If `tierId` is cleared → `PerkChipInput` enabled with an empty array (user must re-enter perks).
- **Label change:** "Card Highlight Subtext" → **"Subtext"**.
- **Submission:** Merge `perks` state into the form payload before sending.

#### [MODIFY] `client/src/components/admin/CMSTiers.jsx`
- Replace the `useFieldArray` row-list perk input with `<PerkChipInput />`.
- Map existing `perks` array (from server) directly into the chip component's `value`.
- On submit, map chips back to a flat `string[]` before sending to the API.
- **Tier deletion guard:** Before calling `deleteMutation.mutate(id)`, query the `admin-boxes` cache (already loaded) to find any boxes with `tierId === tier.id`. If any exist, show a `ConfirmDeleteModal` with the warning: *"This Tier is linked to N Donation Box(es). Deleting it will remove inherited perks from those boxes."*

---

### Layer 4 — Public UI

#### [MODIFY] `client/src/components/donation/DonationCard.jsx`
- Remove the legacy `tierDetails.split('|')` fallback logic entirely.
- `perksList` is now simply `Array.isArray(box.perks) ? box.perks : []`.
- `detailsText` is now exclusively `box.tierDetails` (the descriptive subtext).

---

## Verification Plan

### Database
```bash
npx prisma db push
node server/prisma/seed.js  # runs the one-time migration step
```

### Manual Test Checklist
1. **Standalone Box:** Create a new box with no tier. Enter chips via `PerkChipInput`. Save. Confirm public site renders them correctly.
2. **Tier-Linked Box:** Edit the box and select a Tier. Confirm `PerkChipInput` goes read-only and displays the Tier's perks. Save. Confirm public site reflects the Tier's perks.
3. **Data Freshness:** Update a Tier's perks in CMSTiers. Refresh the public site. Confirm the Donation Box **automatically** shows the new perks without editing the box.
4. **Detach Tier:** Remove the Tier from a Donation Box. Confirm chip input is re-enabled and the box starts with 0 perks.
5. **Tier Delete Warning:** In CMSTiers, delete a Tier that is linked to one or more boxes. Confirm the impact warning appears listing the linked boxes before confirmation.
6. **CMSTiers Chip Input:** Confirm the chip input works correctly in the Tiers editor, replacing the old row-list.
