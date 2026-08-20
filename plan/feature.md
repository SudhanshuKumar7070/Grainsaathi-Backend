# Feature Plan: Phase 1 — Schema Completion & Validation Layer

## Objective
Establish a complete, robust database schema in Prisma to support all platform domain entities (`GsContract`, `SellContract`, `Admin`, `SuperAdmin`, `Receipt`, `Document`, `ChatRoom`, `ChatMessage`, `Notification`, `CropPriceHistory`), and build a reusable Zod validation layer to secure incoming API requests across all endpoints.

---

## 1. Features & Architectural Components

### A. Database Models Expansion (`schema.prisma`)
1. **Admin & SuperAdmin**: Access control, admin assignment to registration tickets.
2. **Contracts (`GsContract` & `SellContract`)**:
   - `GsContract`: Offer/proposal between seller (Farmer/Trader/Org) and buyer (Trader/Org). Status: `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `EXPIRED`.
   - `SellContract`: Finalized binding contract created automatically upon `ACCEPTED` proposal. Status: `ACTIVE`, `COMPLETED`, `DISPUTED`, `CANCELLED`.
3. **Receipt**: Link transaction receipts to completed contracts and crops.
4. **Documents**: Verification uploads for Vyapari/Organisation onboarding.
5. **Real-time Chat**: `ChatRoom` (tied to `SellContract`) and `ChatMessage` (text/image/file).
6. **Notifications**: In-app persistent notification records.
7. **Audit & Analytics**: `CropPriceHistory` for tracking price mutations over time.

### B. Validation Layer (Zod)
1. **Validation Middleware Factory**: `validate(zodSchema)` wrapper that catches validation failures and forwards `ApiError(400)` with structured details.
2. **Modular Validator Schemas**:
   - `Validators/auth.validator.js`: Phone number, OTPs, registration data, passwords.
   - `Validators/crop.validator.js`: Crop name, price, quantity, IDs.
   - `Validators/contract.validator.js`: Contract proposals, status transitions.

---

## 2. Implementation Steps

1. Install `zod`:
   ```bash
   npm install zod
   ```
2. Update `Server/prisma/schema.prisma` with all domain models and relationships.
3. Run Prisma migration and generator:
   ```bash
   npx prisma migrate dev --name "phase1_full_schema"
   npx prisma generate
   ```
4. Create reusable validation middleware in `Server/Validators/index.js`.
5. Create schema definitions in `Server/Validators/auth.validator.js`, `crop.validator.js`, and `contract.validator.js`.
6. Attach validation middleware to existing routes in `Server/Route/`.

---

## 3. Extensibility & Future-Proofing
- **Schema Decoupling**: Enums (`ContractStatus`, `SenderRole`, `MessageType`) guarantee strict state control while allowing easy extension for new roles or communication channels.
- **Composable Validation**: Zod schemas can be composed/reused across HTTP routes, WebSocket event payloads, and queue job processors.
