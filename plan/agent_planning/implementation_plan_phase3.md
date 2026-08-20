# Implementation Plan: Phase 3 (Crop Management & Geo-Search)

This plan details the process for finalizing Crop CRUD operations for Traders and Organisations, fixing the geo-search endpoint, and introducing crop price history tracking for analytics.

## User Review Required

> [!WARNING]
> - **Input Schema Mismatch**: Currently, the `add_crop` controller in `trader.controller.ts` expects `price` in `req.body`, but `crop.validator.ts` demands `priceInPaise`. We will standardize all controllers to use `priceInPaise` and `quantityQuintal` directly, removing the need for manual `price * 100` conversions in the controller.
> - **Raw SQL Mitigation**: The `crops.controller.ts` raw SQL for geo-search fails on `NULL` value comparisons. We will use `Prisma.sql` tagging properly to safely parameterize the variables and handle conditional where-clauses for `maxPrice` and `minPrice`.

## Proposed Changes

---

### 1. Trader Crop Controller
Fixing schema mismatches, adding quantity, and logging price history.

#### [MODIFY] [trader.controller.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/trader.controller.ts)
- Update `add_crop` to read `priceInPaise` and `quantityQuintal` from `req.body` directly.
- Ensure `priceInPaise` is saved directly, removing the internal `convertedPrice = parsedPrice * 100` logic.
- Update `updateCropPrice` to first fetch the current price (`oldPrice`), and insert a new record into `CropPriceHistory` before updating the `Crops` table.

---

### 2. Organisation Crop Controller
Adding complete support for Organisations (Enterprises) to list and manage their crops.

#### [NEW] [organisation.controller.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/organisation.controller.ts)
- Implement `addOrgCrop`, `removeOrgCrop`, `getListedOrgCrop`, and `updateOrgCropPrice`.
- Logic mirrors Trader operations but links to `organisationId` rather than `traderId`.
- Add `CropPriceHistory` insertions to `updateOrgCropPrice`.

#### [MODIFY] [organisation.route.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Route/organisation.route.ts)
- Replace the imported Trader controllers with the newly created Org controllers.
- Add `authorizeRoles("organisation")` to all routes.
- Hook up validation for price updates and removals.

---

### 3. Geo-Search Refactoring
Fixing distance calculations and adding pagination.

#### [MODIFY] [crops.controller.ts](file:///c:/Users/91707/OneDrive/Desktop/CODES/GrainSaathiBackend/Server/Controller/crops.controller.ts)
- Utilize `Prisma.sql` conditionals to optionally inject `minPrice` and `maxPrice` filtering rather than relying on Postgres `IS NULL` parameter limitations.
- Add `page` and `limit` query parameters.
- Incorporate `OFFSET` and `LIMIT` directly into the raw SQL query to properly paginate the geo-distance results.

---

## Verification Plan

### Automated Tests
- N/A

### Manual Verification
1. I will check standard TypeScript build correctness using `npx tsc --noEmit`.
2. I will recommend testing the `add_crop` endpoint manually to verify the new `quantityQuintal` and `priceInPaise` validation works as expected.
3. I will recommend testing the geo-search endpoint with coordinates to ensure the Prisma raw SQL query returns the correct paginated results without crashing on optional price filters.
