# GrainSaathi Backend — Execution Plan v1

> **Source of truth**: [about.md](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/plan/about.md)
> **Approach**: Fix critical bugs first → stabilize foundation → build features incrementally
> **Estimated phases**: 8 phases, each independently deployable

---

## Phase 0: Critical Bug Fixes & Foundation Stabilization

**Goal**: Make the existing codebase actually work before adding anything new.

### 0.1 — Fix Prisma Schema (missing models)

**File**: [schema.prisma](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/prisma/schema.prisma)

Add the missing `Crops` model that controllers already reference:
```prisma
model Crops {
  id              Int           @id @default(autoincrement())
  cropName        String
  priceInPaise    Int
  quantityQuintal Float?
  traderId        Int?
  organisationId  Int?
  trader          Vyapari?      @relation(fields: [traderId], references: [id])
  organisation    Organisation? @relation(fields: [organisationId], references: [id])
  deletedAt       DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}
```

Add relations to `Vyapari` and `Organisation` models:
- `Vyapari` → add `crops Crops[]`
- `Organisation` → add `crops Crops[]`

### 0.2 — Fix `registerKisaan` controller bugs

**File**: [user.controller.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js)

| Bug | Line | Fix |
|-----|------|-----|
| Hardcoded JWT token comparison | L189-193 | **Remove entirely** — this bypasses auth |
| `kisanName` undefined | L255 | Change to `name` |
| `lat`, `long` referenced but commented out | L249-251, L260-261 | Make location optional: remove lat/long from create, or accept from body |
| Inconsistent token parsing (`split(" ")[1]` vs `split(" ")[0]`) | Multiple | Standardize to `split(" ")[1]` (Bearer format) everywhere |

### 0.3 — Strip sensitive fields from API responses

**Files**: [user.controller.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js)

All login/register endpoints currently return the full user object including `password` and `refreshToken`. Fix by using Prisma `select` or manually deleting fields before response:
```js
const { password, refreshToken, ...safeUser } = user;
return res.status(200).json(new ApiResponse(200, safeUser, "..."));
```

### 0.4 — Add `cookie-parser` middleware

**Install**: `npm install cookie-parser`
**File**: [app.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/app.js)

Add `import cookieParser from "cookie-parser"` and `app.use(cookieParser())`.
Without this, `req.cookies?.accessToken` in [auth.middleware.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Middleware/auth.middleware.js) is always `undefined`.

### 0.5 — Add missing routes

**File**: [auth.routes.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Route/auth.routes.js)

Wire up existing but unrouted controllers:
```js
router.route("/login_vyapari").post(loginVyapari);
router.route("/register_company").post(registerCompany);
router.route("/login_company").post(companyLogin);
```

### 0.6 — Fix rate limiter misuse

**File**: [trader.route.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Route/trader.route.js), [farmers.route.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Route/farmers.route.js), [organisation.route.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Route/organisation.route.js)

Remove `rateLimiter` middleware from non-OTP routes (crop CRUD, farmer search). It checks `req.body.phoneNumber` which doesn't exist on these endpoints. Create a separate **general API rate limiter** later in Phase 5.

### 0.7 — Add global error handler

**File**: [NEW] `Server/Middleware/errorHandler.middleware.js`
**File**: [app.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/app.js)

Add Express global error-handling middleware at the end of the middleware chain:
```js
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    statusCode,
    message: err.message || "Internal Server Error",
    success: false,
    data: null
  });
});
```

### 0.8 — Run Prisma migration

After schema changes, run:
```bash
npx prisma migrate dev --name "add_crops_model_and_fixes"
npx prisma generate
```

**Verify**: Start the server with `npm run dev` and confirm no crash.

---

## Phase 1: Schema Completion & Validation Layer

**Goal**: Add all remaining Prisma models and input validation.

### 1.1 — Install validation library

```bash
npm install zod
```

### 1.2 — Add remaining Prisma models

**File**: [schema.prisma](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/prisma/schema.prisma)

Add these models (in dependency order):

```prisma
// ---- Admin & SuperAdmin ----
model Admin {
  id            Int       @id @default(autoincrement())
  name          String
  email         String    @unique
  phone         String    @unique
  password      String
  gsLoginId     String    @unique
  isActive      Boolean   @default(true)
  refreshToken  String?
  superAdminId  Int
  superAdmin    SuperAdmin @relation(fields: [superAdminId], references: [id])
  assignedTickets RegistrationTaskTicket[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model SuperAdmin {
  id            Int       @id @default(autoincrement())
  name          String
  email         String    @unique
  phone         String    @unique
  password      String
  refreshToken  String?
  admins        Admin[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// ---- Contracts ----
enum ContractStatus {
  PENDING
  ACCEPTED
  REJECTED
  CANCELLED
  EXPIRED
}

enum SellContractStatus {
  ACTIVE
  COMPLETED
  DISPUTED
  CANCELLED
}

enum SenderRole {
  KISAAN
  VYAPARI
  ORGANISATION
}

enum ReceiverRole {
  VYAPARI
  ORGANISATION
}

model GsContract {
  id              Int             @id @default(autoincrement())
  cropName        String
  quantity        Float
  pricePerQuintal Int
  totalAmount     Int
  senderId        Int
  senderRole      SenderRole
  receiverId      Int
  receiverRole    ReceiverRole
  status          ContractStatus  @default(PENDING)
  expiresAt       DateTime
  message         String?
  sellContract    SellContract?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model SellContract {
  id              Int                @id @default(autoincrement())
  gsContractId    Int                @unique
  gsContract      GsContract         @relation(fields: [gsContractId], references: [id])
  cropName        String
  quantity        Float
  pricePerQuintal Int
  totalAmount     Int
  sellerId        Int
  buyerId         Int
  status          SellContractStatus @default(ACTIVE)
  printedAt       DateTime?
  completedAt     DateTime?
  chatRoom        ChatRoom?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
}

// ---- Receipt ----
model Receipt {
  id            Int       @id @default(autoincrement())
  cropId        Int
  crop          Crops     @relation(fields: [cropId], references: [id])
  cropPrice     Int
  farmerId      Int
  farmer        Kisaan    @relation(fields: [farmerId], references: [id])
  cropQuantity  Float
  createdAt     DateTime  @default(now())
}

// ---- Documents ----
enum DocStatus {
  PENDING
  VERIFIED
  REJECTED
}

model Document {
  id          Int        @id @default(autoincrement())
  userId      Int
  userRole    SenderRole
  fileUrl     String
  fileType    String
  status      DocStatus  @default(PENDING)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

// ---- Chat ----
enum MessageType {
  TEXT
  IMAGE
  FILE
}

model ChatRoom {
  id              Int           @id @default(autoincrement())
  sellContractId  Int           @unique
  sellContract    SellContract  @relation(fields: [sellContractId], references: [id])
  messages        ChatMessage[]
  createdAt       DateTime      @default(now())
}

model ChatMessage {
  id          Int         @id @default(autoincrement())
  roomId      Int
  room        ChatRoom    @relation(fields: [roomId], references: [id])
  senderId    Int
  senderRole  SenderRole
  content     String
  type        MessageType @default(TEXT)
  fileUrl     String?
  createdAt   DateTime    @default(now())
}

// ---- Notifications ----
model Notification {
  id        Int       @id @default(autoincrement())
  userId    Int
  userRole  SenderRole
  type      String
  title     String
  body      String
  isRead    Boolean   @default(false)
  createdAt DateTime  @default(now())
}

// ---- Price History ----
model CropPriceHistory {
  id        Int       @id @default(autoincrement())
  cropId    Int
  crop      Crops     @relation(fields: [cropId], references: [id])
  oldPrice  Int
  newPrice  Int
  changedAt DateTime  @default(now())
}
```

Update existing models to add new relations:
- `Kisaan` → add `receipts Receipt[]`
- `Crops` → add `receipts Receipt[]`, `priceHistory CropPriceHistory[]`
- `RegistrationTaskTicket` → add `employeeAdmin Admin? @relation(fields: [employeeId], references: [id])`

### 1.3 — Create Zod validation schemas

**File**: [NEW] `Server/Validators/auth.validator.js`
```js
// Zod schemas for: registerKisaan, registerVyapari, registerCompany, sendOtp, verifyOtp
```

**File**: [NEW] `Server/Validators/crop.validator.js`
```js
// Zod schemas for: addCrop, updateCropPrice, removeCrop
```

**File**: [NEW] `Server/Validators/contract.validator.js`
```js
// Zod schemas for: createGsContract, acceptContract, rejectContract
```

**File**: [NEW] `Server/Validators/index.js`
```js
// Validation middleware factory: validate(schema) => middleware
```

### 1.4 — Replace manual validation in controllers

**Files**: All controllers — replace `if (!x) throw new ApiError(...)` chains with `validate(schema)` middleware in routes.

### 1.5 — Run migration

```bash
npx prisma migrate dev --name "add_all_models"
npx prisma generate
```

**Verify**: `npx prisma studio` — confirm all tables exist.

---

## Phase 2: Auth System Overhaul

**Goal**: Complete the authentication system for all 5 roles, add refresh token rotation, logout, and RBAC.

### 2.1 — Refactor auth into service layer

**File**: [NEW] `Server/Service/auth.service.js`

Extract from [user.controller.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js):
- `sendOtp(phoneNumber)` → `AuthService.sendOtp()`
- `verifyOtp(phoneNumber, otp)` → `AuthService.verifyOtp()`
- `generateTokens(userId, role)` → `AuthService.generateTokenPair()`
- `hashPassword(password)` → `AuthService.hashPassword()`
- `comparePassword(plain, hashed)` → `AuthService.comparePassword()`

### 2.2 — Add Admin & SuperAdmin auth

**File**: [MODIFY] `Server/Controller/user.controller.js` — Add:
- `registerAdmin` (SuperAdmin creates admin, generates gs_loginId)
- `loginAdmin` (gs_loginId + password)
- `registerSuperAdmin` (seed/manual, OTP + password)
- `loginSuperAdmin` (phone OTP + password)

**File**: [MODIFY] `Server/Route/auth.routes.js` — Add routes:
```
POST /admin/login
POST /superadmin/login
```

**File**: [NEW] `Server/Route/superadmin.route.js` — Add routes:
```
POST /admin/create
POST /admin/:id/deactivate
GET  /admins
```

### 2.3 — Enterprise/Trader login via gs_loginId

As per about.md, enterprises and traders login using `gs_loginId + gs_password` (NOT OTP) after admin approval.

**File**: [MODIFY] `Server/Controller/user.controller.js`

- Add `gsLoginId` and `gsPassword` fields to Vyapari and Organisation schemas
- Modify `loginVyapari` and `companyLogin` to use gs_loginId + password instead of OTP
- Only allow login if `registrationStatus === "ACCEPTED"`

**File**: [MODIFY] `Server/prisma/schema.prisma`
- Add `gsLoginId String? @unique` and `gsPassword String?` to Vyapari and Organisation models
- Add `registrationStatus isRegistered @default(PENDING)` to Organisation (it's missing)

### 2.4 — Refresh token rotation endpoint

**File**: [MODIFY] `Server/Controller/user.controller.js` — Add `refreshAccessToken`:
```
POST /api/v1/auth/refresh_token
- Read refreshToken from cookies
- Verify it, check it matches DB
- Generate new accessToken + refreshToken
- Update DB, set new cookies
```

### 2.5 — Logout endpoint

**File**: [MODIFY] `Server/Controller/user.controller.js` — Add `logoutUser`:
```
POST /api/v1/auth/logout
- Clear refreshToken from DB
- Clear cookies
```

### 2.6 — Role-based access control (RBAC) middleware

**File**: [NEW] `Server/Middleware/rbac.middleware.js`
```js
const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.userRole)) {
    throw new ApiError(403, "You don't have permission to access this resource");
  }
  next();
};
```

Usage in routes: `router.post("/approve", verifyJwt, authorizeRoles("admin"), approveTicket)`

### 2.7 — Update `verifyJwt` middleware

**File**: [MODIFY] [auth.middleware.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Middleware/auth.middleware.js)

Add Admin and SuperAdmin lookups:
```js
else if (role === "admin") {
  user = await prisma.admin.findUnique({ where: { id: current_id } });
} else if (role === "superadmin") {
  user = await prisma.superAdmin.findUnique({ where: { id: current_id } });
}
```

**Verify**: Test all auth flows — farmer OTP login, trader gs_login, enterprise gs_login, admin login, superadmin login, refresh, logout.

---

## Phase 3: Crop Management & Geo-Search

**Goal**: Complete crop CRUD for all roles, fix geo-search, add price history tracking.

### 3.1 — Fix existing crop controller bugs

**File**: [trader.controller.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/trader.controller.js)

| Bug | Fix |
|-----|-----|
| `prisma.Crops` casing inconsistency | Standardize to `prisma.crops` |
| `removeCrop` passes string `cropId` to `where` expecting Int | `parseInt(cropId)` |
| `updateCropPrice` uses `cropId` from params but doesn't parse to Int | `parseInt(cropId)` |
| `deletedAt` vs `deleted_At` field name mismatch | Match Prisma schema field name |
| SSE instance created per-request in `updateCropPrice` | Use singleton `sseObj` import |

### 3.2 — Add crop quantity field

**File**: [MODIFY] `Server/Controller/trader.controller.js`

Update `add_crop` to accept `quantity` (in quintals) alongside `cropName` and `price`.

### 3.3 — Create organisation crop controller

**File**: [NEW] `Server/Controller/organisation.controller.js`

Separate org-specific crop listing (similar to trader but for organisations). Endpoints:
- `addOrgCrop` — list a crop requirement
- `removeOrgCrop` — soft-delete
- `getOrgListedCrops` — get own listings
- `updateOrgCropPrice` — update price

### 3.4 — Fix geo-search query

**File**: [crops.controller.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/crops.controller.js)

- Fix `minPrice` bug (line 12: uses `req.query.maxPrice` check for minPrice)
- Add pagination (LIMIT + OFFSET)
- Add buyer type filter (trader only / enterprise only / all)
- Return crop details alongside buyer info

### 3.5 — Add crop price history tracking

**File**: [MODIFY] `Server/Controller/trader.controller.js`

In `updateCropPrice`, before updating, save the old price:
```js
await prisma.cropPriceHistory.create({
  data: { cropId, oldPrice: existing.priceInPaise, newPrice: parsedPrice }
});
```

### 3.6 — Update routes

**File**: [MODIFY] `Server/Route/organisation.route.js` — Add full crop CRUD routes
**File**: [MODIFY] `Server/Route/trader.route.js` — Remove rateLimiter, add validation middleware
**File**: [MODIFY] `Server/Route/farmers.route.js` — Remove rateLimiter, add pagination params

**Verify**: Test all crop CRUD operations for traders and organisations. Test geo-search with sample data.

---

## Phase 4: Contract System (gs_contract & sell_contract)

**Goal**: Build the core business logic — contract creation, acceptance, rejection, and sell_contract generation.

### 4.1 — Contract service layer

**File**: [NEW] `Server/Service/contract.service.js`

Business logic:
- `createGsContract(senderId, senderRole, receiverId, receiverRole, cropData)` → creates GsContract with status PENDING, sets expiresAt (24h from now)
- `acceptGsContract(contractId, receiverId)` → validates receiver, updates status to ACCEPTED, creates SellContract in a transaction
- `rejectGsContract(contractId, receiverId, reason)` → updates status to REJECTED
- `cancelGsContract(contractId, senderId)` → sender cancels their own pending contract
- `getContractsByUser(userId, role, filters)` → list contracts with pagination
- `getSellContractDetails(sellContractId)` → full details for printing

### 4.2 — Contract controller

**File**: [NEW] `Server/Controller/contract.controller.js`

Endpoints:
```js
// Farmer/Trader/Enterprise creates a gs_contract
createContract = AsyncHandler(async (req, res) => { ... })

// Buyer accepts a gs_contract → creates sell_contract
acceptContract = AsyncHandler(async (req, res) => { ... })

// Buyer rejects a gs_contract
rejectContract = AsyncHandler(async (req, res) => { ... })

// Sender cancels their own pending contract
cancelContract = AsyncHandler(async (req, res) => { ... })

// List incoming contracts (for buyers)
getIncomingContracts = AsyncHandler(async (req, res) => { ... })

// List sent contracts (for sellers)
getSentContracts = AsyncHandler(async (req, res) => { ... })

// Get sell_contract details (for printing)
getSellContractDetails = AsyncHandler(async (req, res) => { ... })

// Mark sell_contract as completed
completeContract = AsyncHandler(async (req, res) => { ... })
```

### 4.3 — Contract routes

**File**: [NEW] `Server/Route/contract.route.js`

```
POST   /api/v1/contracts/create              → createContract (farmer/trader/org)
GET    /api/v1/contracts/incoming             → getIncomingContracts (buyer)
GET    /api/v1/contracts/sent                 → getSentContracts (seller)
POST   /api/v1/contracts/:id/accept           → acceptContract
POST   /api/v1/contracts/:id/reject           → rejectContract
POST   /api/v1/contracts/:id/cancel           → cancelContract
GET    /api/v1/contracts/sell/:id             → getSellContractDetails
POST   /api/v1/contracts/sell/:id/complete    → completeContract
```

All routes use `verifyJwt` middleware.

**File**: [MODIFY] [app.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/app.js) — Register contract routes.

### 4.4 — SSE notifications for contracts

**File**: [MODIFY] `Server/Controller/contract.controller.js`

After creating a contract, send targeted SSE to the receiver:
```js
sseObj.sendToClient(receiverId, {
  event: "new_gs_contract",
  data: { contractId, cropName, senderId, senderName }
});
```

After accepting/rejecting, notify the sender similarly.

### 4.5 — BullMQ job for contract notifications

**File**: [MODIFY] `Server/Architecture/queue/notification.queue.js` — Already set up.

**File**: [MODIFY] `Server/Architecture/worker/notification.worker.js` — Add handler for `contract_notification` job:
```js
if (job.name === "contract_notification") {
  const { contractId, receiverId, type } = job.data;
  // Send SSE + persist Notification in DB
}
```

### 4.6 — Contract expiry cron job

**File**: [NEW] `Server/Architecture/cron/contractExpiry.cron.js`

Run every hour — find all GsContracts where `status === PENDING` and `expiresAt < now()`, update to EXPIRED, notify both parties.

```js
import cron from "node-cron";
// npm install node-cron

cron.schedule("0 * * * *", async () => {
  const expired = await prisma.gsContract.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" }
  });
  // Notify affected users via SSE
});
```

**Verify**: Full contract lifecycle — create → accept → sell_contract created → print → complete. Also test reject and cancel flows.

---

## Phase 5: Admin System

**Goal**: Build the admin dashboard APIs — ticket management, user moderation, analytics.

### 5.1 — Admin controller

**File**: [MODIFY] `Server/Controller/admin.controller.ts`

Implement:
```js
// List all registration tickets with filters (status, date range)
getTickets = AsyncHandler(async (req, res) => { ... })

// Get single ticket with user details + documents
getTicketById = AsyncHandler(async (req, res) => { ... })

// Approve registration → generate gs_loginId + gs_password → send via SMS
approveRegistration = AsyncHandler(async (req, res) => { ... })

// Reject registration → update status → notify user
rejectRegistration = AsyncHandler(async (req, res) => { ... })

// Ban/block a user
banUser = AsyncHandler(async (req, res) => { ... })

// Unban a user
unbanUser = AsyncHandler(async (req, res) => { ... })

// Delete a crop listing or contract (moderation)
moderatePost = AsyncHandler(async (req, res) => { ... })
```

### 5.2 — gs_loginId generation utility

**File**: [NEW] `Server/utils/gsLoginGenerator.ts`

Generate unique platform IDs like `GS-VY-00123` (for Vyapari) or `GS-ORG-00456` (for Organisation):
```js
export const generateGsLoginId = (role, id) => {
  const prefix = role === "vyapari" ? "GS-VY" : "GS-ORG";
  return `${prefix}-${String(id).padStart(5, "0")}`;
};
```

### 5.3 — Admin routes

**File**: [MODIFY] `Server/Route/admin.route.ts`

```
GET    /api/v1/admin/tickets                → getTickets
GET    /api/v1/admin/tickets/:id            → getTicketById
POST   /api/v1/admin/tickets/:id/approve    → approveRegistration
POST   /api/v1/admin/tickets/:id/reject     → rejectRegistration
POST   /api/v1/admin/users/:id/ban          → banUser
POST   /api/v1/admin/users/:id/unban        → unbanUser
POST   /api/v1/admin/posts/:id/moderate     → moderatePost
```

All routes: `verifyJwt` + `authorizeRoles("admin", "superadmin")`

**File**: [MODIFY] `Server/app.ts` — Register admin routes.

### 5.4 — SuperAdmin controller

**File**: [NEW] `Server/Controller/superadmin.controller.ts`

```js
createAdmin    → Create admin account with generated gs_loginId
deactivateAdmin → Set isActive = false
listAdmins     → List all admins with status
getAnalytics   → Fetch platform analytics (Contracts)
```

### 5.5 — SuperAdmin routes

**File**: [MODIFY] `Server/Route/superadmin.route.ts`

```
POST   /api/v1/superadmin/admin/create         → createAdmin
POST   /api/v1/superadmin/admin/:id/deactivate  → deactivateAdmin
GET    /api/v1/superadmin/admins                → listAdmins
GET    /api/v1/superadmin/analytics             → getAnalytics
```

All routes: `verifyJwt` + `authorizeRoles("superadmin")`

### 5.6 — BullMQ job for registration approval

**File**: [MODIFY] `Server/Architecture/worker/notification.worker.ts`

Add handler for `registration_approved`:
```js
if (job.name === "registration_approved") {
  const { userId, userRole, gsLoginId, gsPassword, phone } = job.data;
  // Send SMS via Twilio with login credentials
  // Send email via Nodemailer (if email provider is set up)
  // Persist notification in DB
}
```

**Verify**: Full admin flow — list tickets → approve → gs_loginId generated → user can login with gs_loginId.

---

## Phase 6: Receipt System

**Goal**: Generate, view, and download receipts for completed sell_contracts.

### 6.1 — Fix existing receipt controller

**File**: [MODIFY] [kisaan.controllers.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/kisaan.controllers.js)

- Fix import paths (missing `.js` extensions)
- Use correct Prisma model names
- Link receipt to a sell_contract instead of just a crop
- Add receipt PDF generation (optional — can use a template or return JSON for frontend rendering)

### 6.2 — Receipt endpoints

**File**: [MODIFY] `Server/Controller/kisaan.controllers.js`

```js
generateReceipt     → Create receipt from sell_contract data
getReceiptById      → Get single receipt
getMyReceipts       → List all receipts for the logged-in user
```

### 6.3 — Receipt routes

**File**: [MODIFY] `Server/Route/farmers.route.js`

```
POST /api/v1/farmer/receipt/generate/:sellContractId  → generateReceipt
GET  /api/v1/farmer/receipts                          → getMyReceipts
GET  /api/v1/farmer/receipt/:id                       → getReceiptById
```

**Verify**: After a sell_contract is COMPLETED, generate a receipt and verify data integrity.

---

## Phase 7: Real-time Chat (Socket.io)

**Goal**: Enterprise-to-enterprise chat tied to sell_contracts.

### 7.1 — Install Socket.io

```bash
npm install socket.io
```

### 7.2 — Socket.io server setup

**File**: [MODIFY] `Server/index.js`

```js
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";

const httpServer = createServer(app);
const io = new SocketServer(httpServer, { cors: { origin: true } });

// JWT auth middleware for socket connections
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  // verify JWT, attach user to socket
});

io.on("connection", (socket) => {
  socket.on("join_room", (roomId) => { ... });
  socket.on("send_message", (data) => { ... });
  socket.on("disconnect", () => { ... });
});

httpServer.listen(port, () => { ... });
```

### 7.3 — Chat controller (REST endpoints)

**File**: [NEW] `Server/Controller/chat.controller.js`

```js
createChatRoom    → Auto-created when sell_contract is created (org-to-org only)
getChatRooms      → List chat rooms for logged-in user
getChatMessages   → Get messages for a room (paginated, newest first)
sendMessage       → Save message to DB + emit via Socket.io (also supports file upload)
```

### 7.4 — Chat routes

**File**: [NEW] `Server/Route/chat.route.js`

```
GET  /api/v1/chat/rooms              → getChatRooms
GET  /api/v1/chat/rooms/:id/messages → getChatMessages
POST /api/v1/chat/rooms/:id/send     → sendMessage
```

All routes: `verifyJwt` + `authorizeRoles("organisation")`

### 7.5 — File upload for chat

**Install**: `npm install multer`

**File**: [NEW] `Server/Middleware/upload.middleware.js`

Configure multer for image/file uploads to `Server/Public/uploads/`. Later can migrate to S3/Cloudinary.

**Verify**: Two organisation users can chat in a room linked to their sell_contract. Messages persist in DB and are delivered in real-time via Socket.io.

---

## Phase 8: Document Upload, Notifications & Polish

**Goal**: Document upload for registration, persistent notifications, and production hardening.

### 8.1 — Document upload for registration

**File**: [NEW] `Server/Controller/document.controller.js`

```js
uploadDocument   → Upload verification docs during registration
getDocuments     → Admin fetches docs for a ticket
```

**File**: [MODIFY] `Server/Route/auth.routes.js` — Add upload route:
```
POST /api/v1/auth/upload_documents  → uploadDocument (multer + verifyJwt)
```

### 8.2 — Persistent notification system

**File**: [NEW] `Server/Controller/notification.controller.js`

```js
getNotifications   → List notifications for logged-in user (paginated)
markAsRead         → Mark single notification as read
markAllAsRead      → Mark all as read
getUnreadCount     → Return count of unread notifications
```

**File**: [NEW] `Server/Route/notification.route.js`

```
GET  /api/v1/notifications           → getNotifications
POST /api/v1/notifications/:id/read  → markAsRead
POST /api/v1/notifications/read-all  → markAllAsRead
GET  /api/v1/notifications/unread    → getUnreadCount
```

### 8.3 — Notification service

**File**: [NEW] `Server/Service/notification.service.js`

Centralize all notification logic:
```js
class NotificationService {
  static async notify(userId, userRole, type, title, body) {
    // 1. Persist to DB
    // 2. Send SSE if client is connected
    // 3. (Future) Send push notification via FCM
  }
}
```

Replace all scattered `sseObj.broadCastToServer(...)` calls with `NotificationService.notify(...)`.

### 8.4 — Email integration (Nodemailer)

**Install**: `npm install nodemailer`

**File**: [NEW] `Server/Config/email.config.js`
**File**: [NEW] `Server/Service/email.service.js`

For:
- Registration approval/rejection emails
- Contract notifications
- Receipt delivery

### 8.5 — Production hardening

**Install**: `npm install helmet express-rate-limit`

**File**: [MODIFY] [app.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/app.js)

```js
import helmet from "helmet";
import rateLimit from "express-rate-limit";

app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
```

### 8.6 — Add structured logging

**Install**: `npm install pino pino-pretty`

**File**: [NEW] `Server/Config/logger.config.js`

Replace all `console.log` with structured logger.

### 8.7 — Health check endpoint

**File**: [MODIFY] [app.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/app.js)

```js
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});
```

### 8.8 — Graceful shutdown

**File**: [MODIFY] `Server/index.js`

```js
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  await redisClient.quit();
  server.close();
});
```

---

## Summary: File Change Matrix

| Phase | New Files | Modified Files | Key Deliverable |
|-------|-----------|---------------|-----------------|
| **0** | 1 (errorHandler) | 5 (schema, user.controller, app, auth.routes, route files) | App doesn't crash |
| **1** | 4 (validators) | 1 (schema) + all controllers | Full DB schema + validation |
| **2** | 3 (auth.service, rbac.middleware, superadmin.route) | 3 (user.controller, auth.routes, auth.middleware) | All 5 roles can auth |
| **3** | 1 (org.controller) | 3 (trader.controller, crops.controller, routes) | Crop CRUD works for all roles |
| **4** | 3 (contract.service, contract.controller, contract.route, cron) | 2 (app, worker) | gs_contract → sell_contract flow |
| **5** | 2 (superadmin.controller, gsLoginGenerator) | 3 (admin.controller, admin.route, worker) | Admin can manage registrations |
| **6** | 0 | 2 (kisaan.controller, farmers.route) | Receipts work |
| **7** | 3 (chat.controller, chat.route, upload.middleware) | 1 (index.js) | Real-time chat |
| **8** | 6 (document, notification, email controllers/services/configs) | 2 (app, index) | Production-ready |

---

## Execution Order & Dependencies

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3 ──┐
                                                 ├──→ Phase 4 ──→ Phase 6
                                                 │
                                                 └──→ Phase 5
                                                 
Phase 4 ──→ Phase 7 (chat needs sell_contract)

Phase 0-7 ──→ Phase 8 (polish after features)
```

---

## Assumptions (needs your confirmation)

1. **gs_contract expiry**: Setting to **24 hours**. Cron job runs hourly to expire stale contracts.
2. **Multi-contract**: A farmer CAN send gs_contracts to multiple buyers simultaneously. When one accepts, others auto-cancel.
3. **No payment integration for MVP** — sell_contract is a printed physical agreement only.
4. **MSP**: Admin-configured per crop (not fetched from govt API for MVP).
5. **No counter-offers for MVP** — strictly accept/reject.
6. **Document storage**: Local (`Public/uploads/`) for MVP, migrate to S3 later.
7. **gs_loginId format**: `GS-VY-00123` for traders, `GS-ORG-00456` for organisations.
8. **Chat**: Enterprise-to-enterprise only, tied to a sell_contract.
9. **No multi-language for MVP** — English only, frontend handles translations later.
10. **Analytics MVP**: Simple counts (total users, active contracts, pending tickets, top crops).
