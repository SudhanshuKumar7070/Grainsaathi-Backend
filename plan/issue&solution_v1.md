# GrainSaathi Backend — Issues & Solutions (Phase 0)

> Every issue listed here is a **current bug, crash, or vulnerability** in the existing codebase.
> Each issue links to the exact file and line. Solutions are provided inline.

---

## 🔴 SEVERITY: CRITICAL (App will crash or not start)

---

### ISSUE #1 — `Crops` model missing from Prisma schema

**File**: [schema.prisma](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/prisma/schema.prisma)
**Impact**: Every crop-related operation crashes with `prisma.crops is not a function`

The controllers ([trader.controller.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/trader.controller.js), [crops.controller.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/crops.controller.js)) reference `prisma.Crops` and `prisma.crops`, but no `Crops` model exists in the schema. The raw SQL in `crops.controller.js` also JOINs on a `"Crops"` table that doesn't exist.

**Solution**: Add the `Crops` model to `schema.prisma`:

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

Also add `crops Crops[]` relation to both `Vyapari` and `Organisation` models.

---

### ISSUE #2 — `Receipt` model missing from Prisma schema

**File**: [schema.prisma](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/prisma/schema.prisma)
**Impact**: `generateReceipt` in [kisaan.controllers.js:L23](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/kisaan.controllers.js#L23) calls `prisma.Receipt.create()` — crashes immediately.

**Solution**: Add `Receipt` model (will be done properly in Phase 1, for now mark as a known stub).

---

### ISSUE #3 — Broken import paths (queue & worker)

**File**: [user.controller.js:L11](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js#L11)

```js
import notificationQueue from "../queue/notification.queue.js";
```

**File**: [index.js:L3](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/index.js#L3)

```js
import "./worker/notification.worker.js";
```

**Impact**: **Server won't start at all.** The directories `Server/queue/` and `Server/worker/` don't exist. The actual files are at:

- `Server/Architecture/queue/notification.queue.js`
- `Server/Architecture/worker/notification.worker.js`

**Solution**: Fix the import paths:

```js
// user.controller.js
import notificationQueue from "../Architecture/queue/notification.queue.js";

// index.js
import "./Architecture/worker/notification.worker.js";
```

---

### ISSUE #4 — Undefined variables in `registerKisaan`

**File**: [user.controller.js:L255](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js#L255)

Three undefined variables that will throw `ReferenceError` at runtime:

| Line       | Variable    | Should Be                                       |
| ---------- | ----------- | ----------------------------------------------- |
| L255       | `kisanName` | `name` (destructured at L166)                   |
| L249, L260 | `lat`       | Removed — location is commented out at L171-180 |
| L250, L261 | `long`      | Removed — location is commented out at L171-180 |

**Solution**: Change `kisanName` → `name`. Remove `lat` and `long` from both the console.log (L245-251) and the Prisma create (L260-261). Location will be handled separately later.

---

### ISSUE #5 — Missing `.js` extensions in imports

**File**: [kisaan.controllers.js:L1-L4](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/kisaan.controllers.js#L1-L4)

```js
import { AsyncHandler } from "../utils/AsynHandler"; // missing .js
import prisma from "../lib/prisma"; // missing .js
import ApiError from "../utils/ApiError"; // missing .js
import ApiResponse from "../utils/ApiResponse"; // missing .js
```

**Impact**: With `"type": "module"` in `package.json`, Node.js requires explicit `.js` extensions. These imports will fail with `ERR_MODULE_NOT_FOUND`.

**Solution**: Add `.js` extension to all four imports.

---

### ISSUE #6 — `ApiError` typo in `captureStackTrace`

**File**: [ApiError.js:L12](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/utils/ApiError.js#L12)

```js
Error.captureStackTrace(this, this.contructor); // typo: "contructor"
```

**Impact**: Stack traces won't be captured correctly. The `this.contructor` is `undefined`, so `captureStackTrace` receives an invalid argument.

**Solution**: Fix the typo → `this.constructor`.

---

## 🟠 SEVERITY: HIGH (Security vulnerabilities / data leaks)

---

### ISSUE #7 — Hardcoded JWT token in `registerKisaan`

**File**: [user.controller.js:L189-L193](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js#L189-L193)

```js
let authorise = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
if (req.headers.authorization !== authorise) {
  throw new ApiError(400, "header not matched");
}
```

**Impact**: This is a **debug/test artifact** left in production code. It:

1. Compares against a hardcoded expired JWT — no real request will match
2. The check happens BEFORE the actual `!req.headers.authorization` check at L194, making the real auth logic unreachable
3. Exposes a previously valid JWT token in source code (credential leak)

**Solution**: Delete lines 189-193 entirely. The proper JWT verification logic already exists at L202-228.

---

### ISSUE #8 — Passwords and refresh tokens leaked in API responses

**Files**: All login handlers in [user.controller.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js)

| Handler           | Line | Leaks                                                 |
| ----------------- | ---- | ----------------------------------------------------- |
| `loginKisaan`     | L349 | Full user object including `password`, `refreshToken` |
| `loginVyapari`    | L488 | Full user object including `password`, `refreshToken` |
| `companyLogin`    | L604 | Full user object including `password`, `refreshToken` |
| `registerKisaan`  | L277 | Full user object including `password`                 |
| `registerVyapari` | L422 | Full user object including `password`                 |
| `registerCompany` | L536 | Full user object including `password`                 |

**Impact**: Anyone calling the login/register API receives the bcrypt-hashed password and refresh token in the JSON response. This is a **serious security vulnerability**.

**Solution**: Strip sensitive fields before sending response:

```js
const { password: _, refreshToken: __, ...safeUser } = user;
return res.status(200).json(new ApiResponse(200, safeUser, "..."));
```

---

### ISSUE #9 — No `cookie-parser` middleware

**File**: [app.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/app.js) (missing)
**File**: [auth.middleware.js:L9](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Middleware/auth.middleware.js#L9)

```js
const accessToken = req.cookies?.accessToken;
```

**Impact**: `req.cookies` is always `undefined` without `cookie-parser`. The auth middleware NEVER authenticates anyone — every protected route returns 402. **No authenticated route works.**

**Solution**:

```bash
npm install cookie-parser
```

```js
// app.js
import cookieParser from "cookie-parser";
app.use(cookieParser());
```

---

### ISSUE #10 — Debug `console.log` statements everywhere

**File**: [user.controller.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js) — Lines 12, 15, 24, 28, 50, 169, 170, 188, 204, 215, 217, 219, 221, 226, 231, 238, 243, 245-251, 266, 273, 415, 417

**Impact**: Logs sensitive data (tokens, phone numbers, passwords) to stdout. In production, this leaks PII and credentials into log files.

**Solution**: Remove all debug `console.log` statements. In Phase 8, we'll add a proper structured logger (pino). For now, remove the most sensitive ones:

- L12: `console.log("ENGINE =", process.env.PRISMA_CLIENT_ENGINE_TYPE)`
- L15: `console.log("getting service id", twilio_service_id)`
- L204: `console.log("Extracted Token:", token)` — leaks JWT
- L245-251: logs user data including lat/long
- L50: `// const sampleBody = "kya re gandwe..."` — inappropriate comment, remove

---

## 🟡 SEVERITY: MEDIUM (Logic bugs / incorrect behavior)

---

### ISSUE #11 — Inconsistent token parsing (Bearer format)

**File**: [user.controller.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js)

| Handler           | Line     | Parsing                        | Format Expected         |
| ----------------- | -------- | ------------------------------ | ----------------------- |
| `registerKisaan`  | L202-203 | `split(" ")[1]` fallback `[0]` | `Bearer <token>` or raw |
| `loginKisaan`     | L286     | `split(" ")[1]`                | `Bearer <token>`        |
| `registerVyapari` | L362     | `split(" ")[0]`                | Raw token (no Bearer)   |
| `loginVyapari`    | L430     | `split(" ")[0]`                | Raw token (no Bearer)   |
| `registerCompany` | L499     | `split(" ")[0]`                | Raw token (no Bearer)   |
| `companyLogin`    | L547     | `split(" ")[0]`                | Raw token (no Bearer)   |

**Impact**: If the client sends `Bearer <token>` (standard format), Vyapari/Company endpoints will try to verify the string `"Bearer"` as a JWT → crash. If the client sends a raw token, Kisaan login will get `undefined` from `split(" ")[1]`.

**Solution**: Standardize all to extract the actual token regardless of format:

```js
const tokenParts = req.headers.authorization.split(" ");
const token = tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];
```

---

### ISSUE #12 — `send_register_otp` only checks Kisaan table

**File**: [user.controller.js:L61-L63](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js#L61-L63)

```js
const user = await prisma.kisaan.findUnique({
  where: { phone: phoneNumber },
});
if (user) throw new ApiError(500, "user already exists");
```

**Impact**: OTP registration flow only checks the `Kisaan` table. A Vyapari or Organisation with the same phone number won't be detected — they'll get through to registration and fail later on unique constraint.

**Solution**: Check all three tables (Kisaan, Vyapari, Organisation) or create a shared OTP flow that accepts a `role` parameter and checks the correct table.

---

### ISSUE #13 — `send_login_otp` only checks Kisaan table

**File**: [user.controller.js:L114-L116](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js#L114-L116)

Same issue as #12 but for login. A Vyapari trying to use `send_login_otp` will get "user not registered" even though they exist in the Vyapari table.

**Solution**: Accept `role` in request body and check the appropriate table.

---

### ISSUE #14 — `rateLimiter` middleware used on non-OTP routes

**Files**:

- [trader.route.js:L13-18](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Route/trader.route.js#L13-L18) — all crop routes have `rateLimiter`
- [farmers.route.js:L6](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Route/farmers.route.js#L6) — crop search has `rateLimiter`
- [organisation.route.js:L6](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Route/organisation.route.js#L6) — crop add has `rateLimiter`

**Impact**: The `rateLimiter` middleware ([otpRateLimiter.middleware.js:L13](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Middleware/otpRateLimiter.middleware.js#L13)) reads `req.body.phoneNumber`. On crop routes, `phoneNumber` doesn't exist in the body → throws `ApiError(400, "phone number is required")`. **Every crop route is broken.**

**Solution**: Remove `rateLimiter` from all non-OTP routes. Keep it only on:

- `send_login_otp`
- `send_register_otp`
- `verify_login_otp`
- `verify_register_otp`

---

### ISSUE #15 — `removeCrop` passes string to Prisma `where` expecting Int

**File**: [trader.controller.js:L64](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/trader.controller.js#L64)

```js
const updated = await prisma.Crops.update({
  where: { id: cropId, traderId: traderId },  // cropId is a string from req.params
```

**Impact**: Prisma expects `id` to be an `Int`. `req.params.cropId` is always a string. This will throw a Prisma validation error.

Note: Line 58 correctly parses to `parsedId` but then L64 uses the unparsed `cropId` instead.

**Solution**: Use `parsedId` in the `update` call:

```js
const updated = await prisma.Crops.update({
  where: { id: parsedId, traderId: traderId },
```

---

### ISSUE #16 — `updateCropPrice` same string-to-Int bug

**File**: [trader.controller.js:L107](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/trader.controller.js#L107)

```js
where: {
  traderId: trader_id,
  id: cropId,  // string, not int
```

**Solution**: `id: parseInt(cropId)`

---

### ISSUE #17 — `updateCropPrice` creates new SSE instance per request

**File**: [trader.controller.js:L94](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/trader.controller.js#L94)

```js
const sseInstance = new SSE();
```

**Impact**: The import `import SSE from "../../SSE/sse_store.js"` imports the **class**, not the singleton. Line 94 creates a brand new instance with an empty client map every time. The broadcast at L117 goes to zero clients.

The file actually exports a singleton at the bottom: `export default sseObj` (not the class). But the import name `SSE` suggests it's being treated as a class.

**Solution**: The import already gets the singleton `sseObj`. Just use it directly:

```js
// Remove: const sseInstance = new SSE();
// Change L117: SSE.broadCastToServer(...)
SSE.broadCastToServer("crop_price_update", { ... });
```

---

### ISSUE #18 — `deleted_At` vs `deletedAt` field name mismatch

**File**: [trader.controller.js:L82](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/trader.controller.js#L82)

```js
where: { traderId: userId, deleted_At: null }  // L82 uses deleted_At
```

```js
data: {
  deletedAt: new Date();
} // L65 uses deletedAt
```

```js
where: { traderId: trader_id, id: cropId, deletedAt: null }  // L108 uses deletedAt
```

**Impact**: Inconsistent field naming will cause Prisma to either reject the query or filter incorrectly depending on which name the schema uses.

**Solution**: Standardize to `deletedAt` (camelCase, matching Prisma convention) everywhere. The new `Crops` model in schema will use `deletedAt`.

---

### ISSUE #19 — `Crops` model casing inconsistency in Prisma calls

**File**: [trader.controller.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/trader.controller.js)

| Line | Usage                    | Correct                  |
| ---- | ------------------------ | ------------------------ |
| L33  | `prisma.Crops.findFirst` | `prisma.crops.findFirst` |
| L40  | `prisma.crops.create`    | ✅ correct               |
| L59  | `prisma.Crops.findFirst` | `prisma.crops.findFirst` |
| L63  | `prisma.Crops.update`    | `prisma.crops.update`    |
| L79  | `prisma.Crops.findMany`  | `prisma.crops.findMany`  |
| L104 | `prisma.Crops.update`    | `prisma.crops.update`    |

**Impact**: Prisma client auto-generates model accessors in camelCase. `prisma.Crops` may work in some versions but is not guaranteed. Inconsistency causes confusion.

**Solution**: Standardize all to `prisma.crops` (lowercase).

---

### ISSUE #20 — `minPrice` filter bug in geo-search

**File**: [crops.controller.js:L12](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/crops.controller.js#L12)

```js
const minPrice = req.query.maxPrice ? Number(req.query.minPrice) : null;
//                    ^^^^^^^^ WRONG — should be req.query.minPrice
```

**Impact**: If the user sends `?minPrice=500` without `maxPrice`, `minPrice` will be `null` because the condition checks `req.query.maxPrice`.

**Solution**: `const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;`

---

### ISSUE #21 — `new Error(500, ...)` instead of `new ApiError(500, ...)`

**File**: [trader.controller.js:L47](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/trader.controller.js#L47)

```js
if (!newCrop) throw new Error(500, "error at crop listing");
```

**Impact**: `new Error()` only takes a message string. Passing `500` as first argument makes the message `"500"` and ignores the second argument. The AsyncHandler won't extract a proper status code.

**Solution**: `throw new ApiError(500, "error at crop listing")`

---

### ISSUE #22 — Missing routes for `loginVyapari`, `registerCompany`, `companyLogin`

**File**: [auth.routes.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Route/auth.routes.js)

These controllers are implemented and exported from `user.controller.js` but NOT wired to any route:

- `loginVyapari` — exported but no route
- `registerCompany` — exported but no route (imported but not used)
- `companyLogin` — exported but no route

**Solution**: Add to `auth.routes.js`:

```js
import {
  loginVyapari,
  registerCompany,
  companyLogin,
} from "../Controller/user.controller.js";

router.route("/login_vyapari").post(loginVyapari);
router.route("/register_company").post(registerCompany);
router.route("/login_company").post(companyLogin);
```

---

### ISSUE #23 — `registerCompany` missing ticket & queue workflow

**File**: [user.controller.js:L491-L537](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js#L491-L537)

`registerVyapari` correctly creates a `RegistrationTaskTicket` + queues an admin notification. But `registerCompany` does neither — it just creates the organisation directly with no admin review.

**Impact**: Organisations bypass the admin approval workflow that's required per the business logic in `about.md`.

**Solution**: Add the same transaction + ticket + queue pattern from `registerVyapari` to `registerCompany`. Also add `registrationStatus` field (the Organisation model doesn't have it — need to add to schema).

---

### ISSUE #24 — Wrong HTTP status codes throughout

**File**: [user.controller.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js)

| Line | Current Code            | Wrong Status | Should Be          |
| ---- | ----------------------- | ------------ | ------------------ |
| L65  | "user already exists"   | 500          | 409 (Conflict)     |
| L119 | "user not registered"   | 402          | 404 (Not Found)    |
| L185 | "all fields required"   | 402          | 400 (Bad Request)  |
| L373 | "user already exists"   | 500          | 409 (Conflict)     |
| L494 | "all fields required"   | 404          | 400 (Bad Request)  |
| L517 | "user already exists"   | 404          | 409 (Conflict)     |
| L545 | "auth token not exists" | 404          | 401 (Unauthorized) |
| L565 | "invalid password"      | 404          | 401 (Unauthorized) |

Also in [kisaan.controllers.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/kisaan.controllers.js):

| Line | Current Code            | Wrong Status | Should Be |
| ---- | ----------------------- | ------------ | --------- |
| L8   | "invalid quantity"      | 403          | 400       |
| L9   | "unauthorised access"   | 403          | 401       |
| L12  | "crop id not available" | 401          | 400       |
| L19  | "no such crop"          | 402          | 404       |

**Solution**: Fix each status code to match HTTP semantics.

---

### ISSUE #25 — `kisaan.controllers.js` uses wrong field names for Receipt

**File**: [kisaan.controllers.js:L14-L28](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/kisaan.controllers.js#L14-L28)

```js
where: { id: crop_id, deleted_At: null }  // deleted_At — will be deletedAt
```

```js
const cropPrice = crop.price; // L20 — Crops model uses priceInPaise, not price
```

```js
data: {
  (crop_id, crop_price, farmer_id, crop_quantity);
} // L24-27 — snake_case field names
```

**Impact**: These field names don't match the Prisma schema. Will throw validation errors.

**Solution**: Will be properly fixed in Phase 6 when Receipt model is implemented. For now, mark as known stub.

---

## 🔵 SEVERITY: LOW (Code quality / no immediate crash)

---

### ISSUE #26 — No global error handler middleware

**File**: [app.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/app.js)

**Impact**: If `AsyncHandler` is ever bypassed (e.g., in middleware like `rateLimiter` which doesn't use it, or synchronous errors in `app.js`), the error bubbles to Express's default handler which sends an HTML page.

**Solution**: Add a global error handler at the end of middleware chain in `app.js`.

---

### ISSUE #27 — Redis config uses hardcoded values

**File**: [redis.config.js:L3-L7](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Config/redis.config.js#L3-L7)

```js
const redisClient = new Redis({
  host: "localhost", // hardcoded
  port: 6379, // hardcoded
});
```

**Impact**: Won't work in production/staging where Redis is on a different host.

**Solution**: Use environment variables:

```js
const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});
```

---

### ISSUE #28 — Twilio config reads env vars at import time

**File**: [twilio.config.js:L3-L4](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Config/twilio.config.js#L3-L4)

```js
const account_sid = process.env.TWILIO_ACCOUNT_SID;
const auth_token = process.env.TWILIO_AUTH_TOKEN;
```

**Impact**: If `dotenv` hasn't loaded yet when this file is imported, both values are `undefined` → Twilio client fails silently. The `import "dotenv/config"` is in `index.js:L1`, but ESM import order isn't guaranteed.

**Solution**: This is currently working because `index.js` imports dotenv first. But it's fragile. Consider moving env loading to the top of `app.js` or using a lazy factory pattern.

---

### ISSUE #29 — `send_register_otp` is OTP-rate-limited AND sends OTP — dead code path

**File**: [user.controller.js:L67-L69](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js#L67-L69)

```js
const is_otp_sent = await sendOtp(phoneNumber);
if (!is_otp_sent)
  throw new ApiError(500, "something went wrong in sending otp");
```

**Impact**: `sendOtp()` always returns `{ message: "success" }` on success — it's truthy. But if `sendOtpMessage()` throws, it's caught inside `sendOtp` and throws `ApiError(500)`. So the `if (!is_otp_sent)` check on L68 will never be reached — it's dead code.

**Solution**: The flow is fine but the check is misleading. Remove the dead check or refactor `sendOtp` to return a boolean.

---

### ISSUE #30 — OTP is generated via `Math.random()` (not cryptographically secure)

**File**: [otpGenarator.js:L3](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/utils/otpGenarator.js#L3)

```js
return Math.floor(100000 + Math.random() * 900000);
```

**Impact**: `Math.random()` is not cryptographically secure. OTPs could theoretically be predicted.

**Solution**: Use `crypto.randomInt()`:

```js
import { randomInt } from "crypto";
export const generateOTP = () => randomInt(100000, 999999);
```

---

### ISSUE #31 — `admin.controller.js` is empty

**File**: [admin.controller.js](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/admin.controller.js)

Only has imports, no actual endpoint implementations. This is expected (will be built in Phase 5) but noted as incomplete.

---

### ISSUE #32 — Inappropriate comment in source code

**File**: [user.controller.js:L50](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/user.controller.js#L50)

```js
// const sampleBody ="kya re gandwe shiv kumar!!! shiv laad"
```

**Impact**: Unprofessional comment in source code. Should be removed before any code review or open-sourcing.

**Solution**: Delete the comment.

---

## Summary Table

| #   | Severity    | File                      | Issue                                     | Type                 |
| --- | ----------- | ------------------------- | ----------------------------------------- | -------------------- |
| 1   | 🔴 CRITICAL | schema.prisma             | `Crops` model missing                     | Missing model        |
| 2   | 🔴 CRITICAL | schema.prisma             | `Receipt` model missing                   | Missing model        |
| 3   | 🔴 CRITICAL | user.controller, index.js | Broken import paths (queue/worker)        | Import crash         |
| 4   | 🔴 CRITICAL | user.controller.js        | Undefined variables in `registerKisaan`   | ReferenceError       |
| 5   | 🔴 CRITICAL | kisaan.controllers.js     | Missing `.js` import extensions           | ERR_MODULE_NOT_FOUND |
| 6   | 🔴 CRITICAL | ApiError.js               | Typo `contructor` → `constructor`         | Bug                  |
| 7   | 🟠 HIGH     | user.controller.js        | Hardcoded JWT token                       | Security             |
| 8   | 🟠 HIGH     | user.controller.js        | Passwords leaked in responses             | Security             |
| 9   | 🟠 HIGH     | app.js                    | Missing `cookie-parser`                   | Auth broken          |
| 10  | 🟠 HIGH     | user.controller.js        | Excessive debug logging                   | PII leak             |
| 11  | 🟡 MEDIUM   | user.controller.js        | Inconsistent token parsing                | Logic bug            |
| 12  | 🟡 MEDIUM   | user.controller.js        | `send_register_otp` only checks Kisaan    | Logic bug            |
| 13  | 🟡 MEDIUM   | user.controller.js        | `send_login_otp` only checks Kisaan       | Logic bug            |
| 14  | 🟡 MEDIUM   | route files               | `rateLimiter` on non-OTP routes           | Logic bug            |
| 15  | 🟡 MEDIUM   | trader.controller.js      | `removeCrop` string-to-Int bug            | Type error           |
| 16  | 🟡 MEDIUM   | trader.controller.js      | `updateCropPrice` string-to-Int bug       | Type error           |
| 17  | 🟡 MEDIUM   | trader.controller.js      | New SSE instance per request              | Logic bug            |
| 18  | 🟡 MEDIUM   | trader.controller.js      | `deleted_At` vs `deletedAt` mismatch      | Field name           |
| 19  | 🟡 MEDIUM   | trader.controller.js      | `prisma.Crops` casing inconsistency       | Code quality         |
| 20  | 🟡 MEDIUM   | crops.controller.js       | `minPrice` filter bug                     | Logic bug            |
| 21  | 🟡 MEDIUM   | trader.controller.js      | `new Error` instead of `new ApiError`     | Wrong class          |
| 22  | 🟡 MEDIUM   | auth.routes.js            | Missing routes for 3 exported handlers    | Incomplete           |
| 23  | 🟡 MEDIUM   | user.controller.js        | `registerCompany` missing ticket workflow | Logic gap            |
| 24  | 🟡 MEDIUM   | user.controller.js        | Wrong HTTP status codes                   | Semantics            |
| 25  | 🟡 MEDIUM   | kisaan.controllers.js     | Wrong field names for Receipt             | Field name           |
| 26  | 🔵 LOW      | app.js                    | No global error handler                   | Code quality         |
| 27  | 🔵 LOW      | redis.config.js           | Hardcoded Redis host/port                 | Config               |
| 28  | 🔵 LOW      | twilio.config.js          | Env vars at import time                   | Fragile              |
| 29  | 🔵 LOW      | user.controller.js        | Dead code check after sendOtp             | Dead code            |
| 30  | 🔵 LOW      | otpGenarator.js           | `Math.random()` not crypto-secure         | Security             |
| 31  | 🔵 LOW      | admin.controller.js       | Empty file (expected)                     | Incomplete           |
| 32  | 🔵 LOW      | user.controller.js        | Inappropriate comment                     | Code quality         |

---

## Phase 0 Fix Order

We will fix issues in this order (dependencies first):

1. **Install `cookie-parser`** → Issue #9
2. **Fix `ApiError` typo** → Issue #6
3. **Add `Crops` model to schema + run migration** → Issue #1
4. **Fix broken import paths** → Issue #3
5. **Fix `registerKisaan` (hardcoded JWT, undefined vars, password leak)** → Issues #4, #7, #8
6. **Fix token parsing consistency** → Issue #11
7. **Fix `trader.controller.js` (type bugs, SSE, field names, Error class)** → Issues #15, #16, #17, #18, #19, #21
8. **Fix `crops.controller.js` minPrice bug** → Issue #20
9. **Fix missing routes** → Issue #22
10. **Remove `rateLimiter` from non-OTP routes** → Issue #14
11. **Fix missing `.js` extensions in kisaan.controllers** → Issue #5
12. **Fix wrong HTTP status codes** → Issue #24
13. **Strip passwords from all responses** → Issue #8
14. **Remove debug logs and inappropriate comments** → Issues #10, #32
15. **Add global error handler** → Issue #26
16. **Fix Redis config** → Issue #27
17. **Fix OTP generator** → Issue #30
18. **Add `registrationStatus` to Organisation + ticket workflow** → Issue #23
