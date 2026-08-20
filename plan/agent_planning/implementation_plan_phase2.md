# Implementation Plan: Phase 2 (Auth System Overhaul)

This plan details the process for fully completing the authentication system, including RBAC, token rotation, logout functionality, and the transition of Enterprise/Trader logins to a `gsLoginId`-based flow.

## User Review Required

> [!WARNING]
> - **Schema Migration**: We will be running `npx prisma migrate dev` again to add `gsLoginId` and `gsPassword` to `Vyapari` and `Organisation`. Please ensure your local Postgres database configuration in `.env` is correct and accessible to prevent the Prisma migration errors we saw in Phase 1.
> - **Service Extraction**: Refactoring controllers into `auth.service.ts` means structural changes to `user.controller.ts`. Functionality will remain identical but the codebase will be more modular.

## Open Questions

> [!IMPORTANT]
> 1. In `exec_v1.md`, `gs_loginId` generation is slated for Phase 5 (`gsLoginGenerator.ts`). Should I build this utility now so we can actually register Admins and generate `gsLoginId`s during this auth phase? I highly recommend it.
> 2. Are you ready for me to proceed with these changes?

## Proposed Changes

---

### Database Schema Updates
Updating `schema.prisma` to support credential-based logins for specific roles.

#### [MODIFY] [schema.prisma](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/prisma/schema.prisma)
- Add `gsLoginId String? @unique` and `gsPassword String?` to both `Vyapari` and `Organisation` models.

---

### Auth Service Layer
Centralizing authentication logic to reduce redundancy.

#### [NEW] [auth.service.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Service/auth.service.ts)
- Extracted methods: `sendOtp`, `verifyOtp`, `generateTokenPair`, `hashPassword`, `comparePassword`.

#### [MODIFY] [user.controller.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.ts)
- Replace inline hashing, token generation, and OTP sending logic with calls to `AuthService`.
- Implement `refreshAccessToken` and `logoutUser`.
- Update `loginVyapari` and `companyLogin` to use `gsLoginId` and `password` (instead of OTPs), and verify `registrationStatus === "ACCEPTED"`.
- Add `registerAdmin`, `loginAdmin`, `registerSuperAdmin`, and `loginSuperAdmin` controllers.

---

### Role-Based Access Control (RBAC) & Middleware Enhancements
Ensuring API endpoint security for all user roles.

#### [NEW] [rbac.middleware.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Middleware/rbac.middleware.ts)
- Create `authorizeRoles(...allowedRoles)` middleware to restrict route access based on `req.userRole`.

#### [MODIFY] [auth.middleware.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Middleware/auth.middleware.ts)
- Update `verifyJwt` to also look up users in the `Admin` and `SuperAdmin` tables when their token role corresponds to those values.

---

### Routes Integration
Wiring up the new controllers and middleware.

#### [MODIFY] [auth.routes.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Route/auth.routes.ts)
- Add endpoints: `POST /logout`, `POST /refresh_token`, `POST /admin/login`, `POST /superadmin/login`.

#### [NEW] [superadmin.route.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Route/superadmin.route.ts)
- Add endpoints: `POST /admin/create`, `POST /admin/:id/deactivate`, `GET /admins`.

## Verification Plan

### Automated Tests
- N/A

### Manual Verification
1. Run `npx prisma studio` to verify `gsLoginId` and `gsPassword` exist.
2. Make manual API requests to verify `refresh_token` generates a new valid access token.
3. Make an API request to a protected route with an invalid role to verify RBAC intercepts the request with a `403 Forbidden` error.
