import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { AsyncHandler } from "../utils/AsynHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

const getCropsOnDistance = AsyncHandler(async (req: Request, res: Response) => {
  const userLocation: any = req.query;
  const cropNameParam = req.params.cropName;
  const cropName = Array.isArray(cropNameParam) ? cropNameParam[0] : cropNameParam;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
  
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  if (!cropName || typeof cropName !== "string" || !cropName.trim())
    throw new ApiError(400, "crop name is not available");
  if (!userLocation || !userLocation.lat || !userLocation.long)
    throw new ApiError(400, "user's location is not available at the moment");
  const lat = Number(userLocation.lat);
  const long = Number(userLocation.long);
  if (isNaN(lat) || isNaN(long)) throw new ApiError(400, "Invalid coordinates");
  if (!req.user || !req.user.id)
    throw new ApiError(401, "user not authenticated");

  const minPriceCond = minPrice !== null ? Prisma.sql`AND cr."priceInPaise" >= ${minPrice}` : Prisma.empty;
  const maxPriceCond = maxPrice !== null ? Prisma.sql`AND cr."priceInPaise" <= ${maxPrice}` : Prisma.empty;

  const crops: any[] = await prisma.$queryRaw`
SELECT
  buyers.id,
  buyers.type,
  buyers.lat,
  buyers.long,
  (
    6371 * acos(
      cos(radians(${lat}))
      * cos(radians(buyers.lat))
      * cos(radians(buyers.long) - radians(${long}))
      + sin(radians(${lat}))
      * sin(radians(buyers.lat))
    )
  ) AS distance
FROM (
    SELECT id, lat, long, 'organisation' AS type FROM "Organisation" WHERE lat IS NOT NULL AND long IS NOT NULL
    UNION ALL
    SELECT id, lat, long, 'trader' AS type FROM "Vyapari" WHERE lat IS NOT NULL AND long IS NOT NULL
) AS buyers

JOIN "Crops" cr
  ON (
      (buyers.type = 'trader' AND buyers.id = cr."traderId")
   OR (buyers.type = 'organisation' AND buyers.id = cr."organisationId")
  )

WHERE cr."cropName" = ${cropName}
  AND cr."deletedAt" IS NULL
  ${minPriceCond}
  ${maxPriceCond}
GROUP BY buyers.id, buyers.type, buyers.lat, buyers.long
ORDER BY distance ASC
LIMIT ${limit}
OFFSET ${offset};
`;
  if (!crops.length)
    throw new ApiError(
      404,
      "no crops found matching criteria",
    );
  return res
    .status(200)
    .json(new ApiResponse(200, crops, "crops fetched successfully"));
});

export { getCropsOnDistance };
