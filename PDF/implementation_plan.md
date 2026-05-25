# Monthly Donation Program Implementation Plan

## 1. Project Overview & Objectives
**Goal:** Build a customizable monthly donation web platform for OpenmindProjects (OMP) that encourages recurring donations, automates tax receipts, manages donation tiers, and funds both general platform operations and specific community/environment projects.

**Key Features:**
- Monthly recurring donations with automatic tier progression based on total accumulated contributions.
- Gamification via "piggy banks" (10% of donations) where donors and shareholders vote on funded projects.
- User dashboards to track total donations, current tier, and claim objectives (e.g., certificates).
- Customizable website content (text, donation boxes, active projects).

---

## 2. Technology Stack
- **Front-end:** ReactJS (Vite recommended for modern, fast builds)
- **Back-end:** ExpressJS (Node.js)
- **Database:** PostgreSQL
- **Payment Gateway:** Stripe (for handling recurring subscriptions and credit card processing)

---

## 3. Database Schema (PostgreSQL)
Database Name: `MDonationDB`

### Tables
1. **Users**
   - `id` (PK, UUID)
   - `first_name` (String)
   - `last_name` (String)
   - `email` (String, Unique)
   - `password` (String, Hashed)
   - `total_donation_amount` (Integer)
   - `current_tier` (Integer)
   
2. **Website_Content**
   - `id` (PK)
   - `head` (String)
   - `subtitle` (String)
   - `body` (String)
   
3. **Projects_Detail**
   - `id` (PK)
   - `project_name` (String)
   - `details` (Text)
   
4. **Donation_Boxes**
   - `id` (PK)
   - `title` (String)
   - `amount` (Integer)
   - `tier_details` (String)
   - `button_text` (String - default: "Donate")
   
5. **Tiers**
   - `id` (PK)
   - `tier_level` (Integer - 1: Regular, 2: Shareholder, 3: Patron)
   - `min_amount` (Integer)

*(Note: The DB schema implies relations between Users and Tiers. Tracking transaction history will also require a `Transactions` table to accurately track monthly renewals).*

---

## 4. Backend Architecture (Express.js)

### Core API Endpoints
**Website Content**
- `GET /api/v1/Website/GET/getContent`
  - Returns website structure, text, active projects, and donation box configurations.

**User Management & Auth**
- `GET /api/v1/User/GET/getIsUserExist?email={email}`
  - Returns: boolean (True/False)
- `POST /api/v1/User/POST/getLogInDetails` *(Adapted to POST for security)*
  - Input: Email, Password
  - Returns: User details object
- `GET /api/v1/User/GET/getUser`
  - Input: Email, Password Hash (via auth token/session in practice)
  - Returns: User profile info (Total donations, Tier, Objectives)

**Payments (Stripe Integration)**
- `GET /api/v1/Transaction/GET/isValidCreditCard`
  - Validates card details (via Stripe token/payment method).
- `POST /api/v1/Transaction/POST/SendCreditCardDetails`
  - Inputs: User info, Amount, Card Details/Token.
  - Action: Creates Stripe Customer, Setups Subscription, auto-creates user if new, updates `TotalDonationAmount` in DB.
  - Returns: boolean (Success/Failure).

---

## 5. Frontend Architecture (ReactJS)

### Routing (React Router)
- `/donation` - Main landing page and donation selection.
- `/login` / `/register` - Authentication screens.
- `/dashboard` - User profile, tier status, total donations, and objective claims.
- `/settings` - Manage account (email, password).

### Key Components
1. **Main Screen (`/donation`)**
   - **Header & Info Sections**: Displays `Website Text` and `Projects Detail` fetched from backend.
   - **Donation Box Fragment**: Renders dynamic donation cards. The first box should always be a custom amount input box.
2. **Checkout / Donation Form Modal**
   - Collects Country, Email, Name, Password (to auto-create account), and Credit Card details.
   - Integrates Stripe Elements for secure UI credit card data handling.
3. **User Dashboard**
   - Displays User's Tier (Regular, Shareholder, Patron).
   - Displays Total Donations.
   - **Claim Objectives Module**: Unlockable rewards ($1k Silver cert, $2k Gold cert, $3k Platinum cert, $6k Camp Patron, $10k Patreon wall).
4. **Settings Fragment**
   - Form to change password and email.

---

## 6. Business Logic & Progression Mechanics

### Tier System Requirements
1. **Regular ($1 - $84)**:
   - Calculate voting seeds: `$1 = 1 seed`.
   - Perks: Monthly newsletter, Yearly impact zoom event, discounted tours.
2. **Shareholders ($85 - $169)**:
   - Inherits regular perks.
   - Perks: Quarterly progression meetings, special campaign voting.
   - Voting calculation: Every `$10` above `$75` grants an additional vote.
3. **Patron ($170+)**:
   - Inherits shareholder perks.
   - Includes physical/social media rewards (T-shirt sponsor print, video thank you on social media).

### Financial Distribution Logic
- Process monthly cron job/webhook via Stripe to update user's `total_donation_amount`.
- Route **10%** of total incoming funds to "Piggy Bank 1" (Donor Seed Voting for project boost).
- Route an additional **10%** to "Piggy Bank 2" (Shareholder Campaign Voting).

---

## 7. Next Steps & Development Phases
- **Phase 1: Foundation & Scaffold**
  - Set up Git repo, initialize Vite React app, Express server, and Postgres DB.
  - Implement basic DB schemas.
- **Phase 2: Core Platform & Stripe**
  - Build main `/donation` UI components.
  - Integrate Stripe API for recurring subscription payments.
  - Build Donation Box fragment and user auto-creation during checkout.
- **Phase 3: User Dashboard & Auth**
  - Implement authentication (JWT).
  - Build user dashboard to show tiers, accumulated donations, and claimable objectives.
- **Phase 4: Gamification & Voting (Future Polish)**
  - Implement the seed calculation logic and the voting UI for the 2 piggy banks.
