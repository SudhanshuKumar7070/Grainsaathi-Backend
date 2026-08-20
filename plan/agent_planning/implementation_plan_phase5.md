# Phase 5: Admin System Implementation Plan

This phase aims to build the administrative backbone of GrainSaathi. It will empower the platform administrators to moderate the user base, verify trade documents, issue platform credentials via background workers, and track basic analytics. We will also implement the SuperAdmin features to manage Admins.

## User Review Required

> [!IMPORTANT]
> The auto-generation of passwords for users upon registration approval needs to be secure but communicable via SMS/Email. I plan to use a random 8-character string (e.g., `crypto.randomBytes(4).toString('hex')`) for the generated password. Please confirm if this is acceptable, or if you prefer a different format.

> [!CAUTION]
> For the `moderatePost` feature, deleting a contract might cause cascading data issues if it's already a `SellContract` with receipts or chat histories. I plan to implement a soft-cancel or strict status change (e.g. `CANCELLED` by Admin) rather than hard deletion for contracts. Let me know if you strictly prefer hard deletion.

## Open Questions

> [!WARNING]
> 1. Which metrics exactly do you want for "Overall platform GMV"? Should it sum the `totalAmount` of all `SellContract`s that have `status = 'COMPLETED'`?
> 2. Should `moderatePost` only target `Crops` (listings) and `GsContract` (proposals), or should Admins also be able to modify/delete finalized `SellContract`s?
> 3. Does the SMS delivery via Twilio need to be fully wired up in the BullMQ `registration_approved` worker, or should I leave a console log / mock implementation until the Twilio template is finalized?

## Proposed Changes

---

### Validators

#### [NEW] `Server/Validators/admin.validator.ts`
- `approveRegistrationSchema`: Validates approval payload.
- `rejectRegistrationSchema`: Validates rejection reason.
- `banUserSchema`: Validates user ID, role, and reason.

#### [NEW] `Server/Validators/superadmin.validator.ts`
- `createAdminSchema`: Validates admin creation payload (name, phone, email, password).

---

### Core Business Logic (Services & Repositories)

#### [MODIFY] `Server/Repositories/Admin.repo.ts`
- Add methods: `getTickets(filters)`, `getTicketById(id)`, `updateTicketStatus(id, status)`, `updateUserStatus(userId, role, status)`, `deleteCrop(id)`, `getAnalytics()`.

#### [MODIFY] `Server/Repositories/SuperAdmin.repo.ts`
- Add methods: `createAdmin(data)`, `deactivateAdmin(id)`, `listAdmins()`.

#### [NEW] `Server/Service/admin.service.ts`
- Encapsulates admin business logic.
- Orchestrates registration approval: Updates ticket status -> Generates `gs_loginId` & password -> Hashes password -> Updates Vyapari/Organisation -> Dispatches `registration_approved` to BullMQ.

#### [NEW] `Server/Service/superadmin.service.ts`
- Encapsulates SuperAdmin logic. Creates Admins and generates their `gsLoginId`.

---

### Utilities & Workers

#### [NEW] `Server/utils/gsLoginGenerator.ts`
- Logic to generate sequential or random-based unique IDs: `GS-VY-XXXXX` for Vyapari, `GS-ORG-XXXXX` for Organisations, and `GS-AD-XXXXX` for Admins.

#### [MODIFY] `Server/Architecture/worker/notification.worker.ts`
- Add handler for `registration_approved` job.
- Mock or wire SMS sending logic (Twilio) to notify the user of their new `gs_loginId` and `gs_password`.

---

### Controllers & Routes

#### [MODIFY] `Server/Controller/admin.controller.ts`
- Implement robust controllers wrapped in `AsyncHandler`. 
- Extract request parameters, invoke `AdminService`, and return standard `ApiResponse`.

#### [MODIFY] `Server/Route/admin.route.ts`
- Define endpoints for tickets, users, posts, and analytics.
- Apply `verifyJwt` and `authorizeRoles("admin", "superadmin")`.

#### [NEW] `Server/Controller/superadmin.controller.ts`
- Implement `createAdmin`, `deactivateAdmin`, `listAdmins`.

#### [MODIFY] `Server/Route/superadmin.route.ts`
- Define SuperAdmin endpoints secured by `authorizeRoles("superadmin")`.

## Verification Plan

### Automated Tests
- N/A for this phase, no formal unit testing framework is set up yet based on the codebase (only manual testing via TS checks).

### Manual Verification
1. Start the development server (`npm run dev`).
2. Log in as a SuperAdmin, create a new Admin.
3. Log in as the new Admin.
4. Fetch all pending registration tickets.
5. Approve a ticket; verify the Vyapari/Organisation receives a `gsLoginId`, their status updates to `ACCEPTED`, and the BullMQ job executes.
6. Verify the analytics endpoint returns accurate platform numbers.
