# Implementation Review — Hover Interactions & Dynamic Tiers

Reviewing [implementation_plan.md](file:///c:/Users/Lenovo/OneDrive/Documents/Donation%20site/Donation-Site-Project/implamention%20plans/implementation_plan.md)

## 🔴 Critical Issues

### 1. `content.js` — Avoid the Pipe (`|`) Hack (Send an Array)

**The plan says:**
> Map the detailed perks to shorter, card-friendly versions or join the perks array using `" | "` to dynamically populate the `box.tierDetails` string.

**The problem:** Taking the JSON `perks` array from the `Tier` table and joining it with `" | "` on the backend purely because the frontend currently uses `.split('|')` is fragile. If an admin ever includes a `|` character in a perk description, it will silently break the UI layout.

**Fix to add to the plan:**
- Instead of formatting for the client on the backend, update `content.js` to assign the actual array: `box.perks = tier.perks;`.
- Refactor `DonationCard.jsx` to accept an array natively: `const perksList = Array.isArray(box.perks) ? box.perks : box.tierDetails.split('|');`.

---

### 2. `content.js` — Defensive Fallbacks for Missing Tiers

**The plan says:**
> Find the matching `Tier` record where `tier.name.toLowerCase() === box.title.toLowerCase()`. If a match exists, parse `tier.perks`...

**The problem:** The plan does not specify what happens if a match does *not* exist. If an admin later adds a new `DonationBox` (e.g., "Student Box") but forgets to create a corresponding `Tier` named "Student Box", the backend logic might fail to populate perks or throw an error.

**Fix to add to the plan:**
- Provide a strict fallback in the mapping logic. If `matchingTier` is undefined, fallback to the legacy static details: `box.perks = box.tierDetails ? box.tierDetails.split('|') : [];`.

---

## 🟡 Medium Issues

### 3. `ProjectsSection.css` — The "Sticky Hover" Bug on Mobile Devices

**The plan says:**
> .project-card:hover .project-card__details, .project-card.project-card--expanded .project-card__details: Expand max-height smoothly to 400px

**The problem:** iOS Safari and Android Chrome simulate `:hover` on the first tap. If we mix CSS `:hover` with a React `onClick` toggle, mobile users will experience a frustrating double-tap requirement to expand/collapse the card.

**Fix to add to the plan:**
- Wrap all CSS hover rules in a modern media query: `@media (hover: hover) and (pointer: fine) { ... }`.
- This restricts hover expansion strictly to devices with a real mouse. Mobile devices will seamlessly rely entirely on the React `onClick` state.

---

### 4. `ProjectsSection.css` — CSS Grid Row Stretching (Layout Shifts)

**The plan says:**
> Expand `max-height` smoothly to `400px` (or `25em`).

**The problem:** When one project card expands its `max-height`, it pushes the bottom of the card down. Since the cards live in a CSS grid (`.projects-grid`), the *other* cards in that same row will automatically stretch in height to match the expanded card, leaving awkward empty space inside the non-expanded sibling cards.

**Fix to add to the plan:**
- Add `align-items: start;` to the `.projects-grid` container. This ensures cards size themselves independently, allowing the hovered card to grow downwards without forcing siblings to stretch.

---

## 🟢 Minor Suggestions

### 5. `ProjectsSection.css` — Max-Height Transition Delay Pitfall

The plan animates `max-height` to `400px`. When hovering *out* (closing the card), the CSS engine transitions down from `400px`, even if the text was only `200px` tall. This causes a noticeable "delay" before the card visually begins to shrink.

**Recommendation:** Keep the expanded `max-height` as tight as possible to the real content (e.g., `250px` or `300px`), or utilize different easing curves for opening vs. closing to mask the delay.

---

### 6. `DonationPage.jsx` — Simplification of Client Fallback Data

The plan recommends running dynamic tier-matching logic inside the `DonationPage.jsx` `catch` block. Since the `catch` block is a static fallback for when the API is down (e.g., demo mode), running dynamic mapping is unnecessary overhead.

**Recommendation:** Hardcode the already-mapped array structure into the fallback state. Keep the client component logic simple and focused purely on rendering.

---

## Summary Table

| # | Severity | Issue | Action Required |
|---|----------|-------|-----------------|
| 1 | 🔴 Critical | Data fragility with `|` splitting | Send `box.perks` as an array from the backend |
| 2 | 🔴 Critical | Missing tier lookup throws/leaves undefined | Add fallback to `box.tierDetails` if no tier matches |
| 3 | 🟡 Medium | Sticky hover bug on iOS/Android touchscreens | Wrap hover CSS in `@media (hover: hover) and (pointer: fine)` |
| 4 | 🟡 Medium | Expanding card stretches siblings in CSS Grid | Add `align-items: start` to `.projects-grid` |
| 5 | 🟢 Minor | Transition delay when closing card | Tighten `max-height` limit or adjust easing curves |
| 6 | 🟢 Minor | Overly complex fallback logic | Hardcode the mapped array in the catch block directly |

---

## Verdict

**The plan is ready to implement after resolving issues #1, #2, #3, and #4.** These issues address potential UI breakages, data mapping errors, and mobile usability frustrations. Once incorporated, the execution phase can safely begin.
