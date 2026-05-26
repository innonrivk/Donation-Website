# Task Checklist — Minimalist Checkout Scrollbar & Alignment

- [x] **Phase 1: Research & Setup**
  - [x] Analyze existing layout structure in `Modal.jsx` and `Modal.css`
  - [x] Confirm no other modals share the `<Modal>` component to avoid regressions

- [x] **Phase 2: CSS Refactoring (Modal Structure)**
  - [x] Convert `.modal` into a flex column with `overflow: hidden`
  - [x] Lock `.modal__header` with `flex-shrink: 0`
  - [x] Move scroll container to `.modal__body` with `overflow-y: auto` and `flex-grow: 1`

- [x] **Phase 3: Sleek Custom Scrollbar Implementation**
  - [x] Implement custom `::-webkit-scrollbar` styling on `.modal__body`
  - [x] Style scrollbar track to be completely transparent
  - [x] Set thin scrollbar width to `6px`
  - [x] Apply brand-accent transparent thumb (`rgba(66, 133, 244, 0.18)`) with smooth hover state (`rgba(66, 133, 244, 0.35)`)

- [x] **Phase 4: Build & Local Validation**
  - [x] Verify client build succeeds with `npm run build`
  - [x] Launch development server and test modal scrolling mechanics on multiple viewport heights
  - [x] Double-check close button position, header stickiness, and rounded corner boundaries
