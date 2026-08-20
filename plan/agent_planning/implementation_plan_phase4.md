# Implementation Plan: Phase 4 (Contract System)

This plan details the implementation of the core business logic for GrainSaathi: creating `GsContracts`, and accepting them to generate `SellContracts`. 

Following your new building strategy, we will strictly adhere to the layered architecture: `Router → Middleware → Validator → Controller → Service → Repository`.

## User Review Required

> [!WARNING]
> - **Receiver Role Validation**: The `createContractSchema` currently lacks a `receiverRole`. We will add this since a sender needs to specify whether they are offering the contract to a `VYAPARI` (Trader) or `ORGANISATION` (Enterprise).
> - **Expiry Time**: By default, we will set pending contracts to expire in **24 hours**.

## Proposed Changes

---

### 1. Data Validation Layer
Extending the Zod schemas to ensure type-safe contract data.

#### [MODIFY] [contract.validator.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Validators/contract.validator.ts)
- Add `receiverRole: z.enum(["VYAPARI", "ORGANISATION"])` to `createContractSchema`.
- Ensure strict parsing for `pricePerQuintal` and `quantity`.

---

### 2. Repository Layer (Database Access)
Isolating Prisma logic into a dedicated repository.

#### [NEW] [contract.repo.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Repositories/contract.repo.ts)
- `createGsContract`: Creates a `GsContract` in the DB.
- `findGsContractById`: Fetches a contract with relational validation.
- `acceptContractTransaction`: A Prisma `$transaction` that updates the `GsContract` status to `ACCEPTED` and instantly creates a `SellContract` ledger entry.
- `updateContractStatus`: For rejecting or cancelling contracts.
- `getContractsByUser`: Paginated queries for incoming and outgoing contracts.

---

### 3. Service Layer (Business Logic)
Handling the heavy lifting and cross-cutting concerns (like SSE).

#### [NEW] [contract.service.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Service/contract.service.ts)
- `createContract`: Calculates `totalAmount` (`quantity * pricePerQuintal`), sets `expiresAt` (24h), and delegates to the repository. Emits real-time `new_gs_contract` via SSE.
- `acceptContract`: Verifies the acceptor is actually the intended receiver and that the contract is still `PENDING`. Emits `contract_accepted` via SSE.
- `rejectContract`: Verifies ownership and updates status to `REJECTED`. Emits `contract_rejected` via SSE.
- `getIncomingContracts` / `getSentContracts`: Data fetching orchestrators.

---

### 4. Controller Layer (HTTP Handlers)
Thin wrappers mapping Express req/res to the Service layer.

#### [NEW] [contract.controller.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/contract.controller.ts)
- `createContractController`
- `acceptContractController`
- `rejectContractController`
- `getIncomingContractsController`
- `getSentContractsController`

---

### 5. Routing Layer
Exposing the controllers and wiring up middlewares.

#### [NEW] [contract.route.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Route/contract.route.ts)
- `POST /create` (protected)
- `POST /:id/accept` (protected)
- `POST /:id/reject` (protected)
- `GET /incoming` (protected)
- `GET /sent` (protected)

#### [MODIFY] [app.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/app.ts)
- Register `contractRoutes` under `/api/v1/contracts`.

---

## Verification Plan

### Automated Tests
- TypeScript strict compilation check (`npx tsc --noEmit`).

### Manual Verification
1. I will recommend testing the `/api/v1/contracts/create` route using Postman/Insomnia with a valid Farmer/Trader JWT to ensure the `GsContract` generates properly.
2. I will recommend testing the accept flow to guarantee the Prisma transaction creates the final `SellContract`.
