# Feature Plan: Phase 6 — Receipt System

## Objective
Generate, view, and download receipts for completed sell_contracts. This serves as the final documentation of a trade between a farmer and a buyer or between enterprises.

---

## 1. Features & Architectural Components

### A. Receipt Generation
- **Repositories & Services**: Build `kisaan.repo.ts` and `kisaan.service.ts` (or reuse existing) for receipt specific logic.
- **Generate Receipt**: When a `SellContract` is marked as `COMPLETED`, automatically or manually generate a `Receipt` record in the database.
- **Data Association**: Link the receipt to a `SellContract` instead of just a crop, ensuring proper transaction tracking.

### B. Receipt Retrieval
- **View Single Receipt**: Fetch a single receipt by ID with full details (farmer info, buyer info, crop info, price, quantity).
- **List Receipts**: Allow a logged-in user (farmer/buyer) to fetch all their generated receipts (paginated).

### C. PDF Generation (Optional/Future)
- Add receipt PDF generation using a template engine (like `ejs` or `puppeteer`) or simply return JSON for the frontend to render and print.

---

## 2. Layered Architecture Implementation
Adhering to the `Router → Validator → Controller → Service → Repository` pattern:
- **Validators**: `receipt.validator.ts` for generation endpoints.
- **Repositories**: Access to `Receipt` and `SellContract` models.
- **Services**: Handle the business logic of verifying a completed contract before issuing a receipt.
- **Controllers**: Handle Express requests, guarded by `verifyJwt`.
