# Content Management System (CMS) Architecture Overview

The OpenmindProjects Donation Site implements a custom, monolithic CMS that is directly integrated into the core backend. It uses a strict namespace separation (`public` vs `admin`) and a specialized Data Access Layer (DAL) to ensure that content can be read by anyone but only modified by authenticated administrators.

Here is a detailed breakdown of the system components, data models, and the APIs used for writing and reading site text.

## 1. Data Models (The Schema)
The CMS relies on several Prisma models to store dynamic content. The primary model for site text is `WebsiteContent`, but the CMS also governs `DonationBox`, `ProjectDetail`, `Tier`, and `DonationMilestone`.

*   **`WebsiteContent` (`website_content` table):**
    This model stores the primary text and configuration for the site.
    *   `head`: The main headline text.
    *   `subtitle`: The subtitle text.
    *   `body`: The main body copy/HTML.
    *   `version`: An integer version tracker for changes.
    *   `updatedAt`: Timestamp of the last modification.
    *(Note: Based on the `findFirst({ orderBy: { id: 'desc' } })` query, the system keeps a history of content by creating new rows or just pulling the latest ID).*

*   **Other Content Models:**
    *   `DonationBox`: Configures the pre-set donation amounts and buttons.
    *   `ProjectDetail`: Details for funding goals and specific projects.
    *   `DonationMilestone`: Text and configuration for repeatable/one-time milestones.
    *   `Tier`: Descriptions and perks for monthly donation tiers.

## 2. The Security Gatekeeper (`prismaPublic.js`)
To enforce strict separation of concerns, the project uses a custom Prisma Proxy pattern located in `server/src/lib/prismaPublic.js`. 

> [!IMPORTANT]
> **Mechanical Write-Block Guard:** This proxy wraps the Prisma client for all public routes. If a developer accidentally writes code in a `public` controller that attempts to mutate (`create`, `update`, `delete`, `upsert`) any of the protected content models (like `websiteContent`), the proxy will **intercept the call and throw a loud runtime error**. 
> 
> *Error Message:* `[PUBLIC_GUARD] Write access denied on content model... Content mutations are only permitted through admin controllers.`

This guarantees that public endpoints can only ever *read* CMS data.

## 3. The Read API (Public Namespace)
The frontend retrieves the CMS data through the public API namespace.

**Endpoint:** `GET /api/v1/public/content`
**Controller:** `server/src/routes/public/content.js`

**How it works:**
1.  **Parallel Fetching:** It uses `Promise.all` to concurrently fetch the latest `WebsiteContent`, active `DonationBox`es, active `ProjectDetail`s, `Tier`s, and `DonationMilestone`s.
2.  **Mapping:** It pipes the `donationBoxes` and `tiers` through a utility function `mapDonationBoxes()` to resolve tier perks and structure the data for the frontend.
3.  **Delivery:** It returns a single, comprehensive JSON payload containing all the necessary text and configuration to render the site's public UI.

## 4. The Write API (Admin Namespace)
Content creation and modification are strictly handled by the Admin namespace, protected by JWT/Cookie-based RBAC authentication middleware (which checks for `UserRole.ADMIN`).

**Base Route:** `/api/v1/admin/content`
**Controller:** `server/src/controllers/admin/adminContentController.js`

This controller uses the standard `prisma.js` (unproxied) client, allowing full write access to the database.

### API Endpoints for `WebsiteContent`:
*   `GET /`: Fetches a list of all historical `WebsiteContent` entries, ordered by newest first.
*   `POST /`: Creates a new `WebsiteContent` entry.
    *   *Payload:* `{ head, subtitle, body, version }`
*   `PUT /:id`: Updates a specific `WebsiteContent` entry by ID.
    *   *Payload:* `{ head, subtitle, body, version }`
*   `DELETE /:id`: Deletes a specific `WebsiteContent` entry.

### Validation & Error Handling
> [!TIP]
> The admin controller implements strict input validation using **Zod** (`WebsiteContentSchema` and `DonationBoxSchema`). 

Before any database write occurs, the incoming payload is parsed. If validation fails, the API immediately returns a `400 Bad Request` with `ErrorCodes.VALIDATION_ERROR` and a detailed map of the field errors.

Prisma errors (like `P2025` for "Record to update not found") are explicitly caught and transformed into clean `404 Not Found` HTTP responses.

## Summary
The OpenmindProjects CMS is highly secure and monolithic. It prevents accidental public data pollution via a clever `Proxy` pattern on the Prisma client (`prismaPublic.js`), utilizes `Zod` for strict admin write validation, and serves all site copy and configurations to the frontend via a single, highly-optimized public aggregate endpoint.
