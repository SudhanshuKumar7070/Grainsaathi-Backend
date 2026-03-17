import prisma from "../lib/prisma.js";
import { AsyncHandler } from "../utils/AsynHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

// list all crops listed on the basis of current location of the farmer

const getCropsOnDistance = AsyncHandler(async (req, res) => {
  const userLocation = req.query;
  const cropName = req.params.cropName;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
  const minPrice = req.query.maxPrice ? Number(req.query.minPrice) : null;

  if (!cropName || !cropName.trim())
    throw new ApiError(403, "crop name is not available");
  if (!userLocation || !userLocation.lat || !userLocation.long)
    throw new ApiError(403, "user's location is not available at the moement");
  const lat = Number(userLocation.lat);
  const long = Number(userLocation.long);
  if (isNaN(lat) || isNaN(long)) throw new ApiError(400, "Invalid coordinates");
  if (!req.user || !req.user.id)
    throw new ApiError(402, "user not authenticated");
  const userId = req.user.id;
  const crops = await prisma.$queryRaw`
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
    SELECT id, lat, long, 'organisation' AS type FROM "Organisation"
    UNION ALL
    SELECT id, lat, long, 'trader' AS type FROM "Vyapari"
) AS buyers

JOIN "Crops" cr
  ON (
      (buyers.type = 'trader' AND buyers.id = cr."traderId")
   OR (buyers.type = 'organisation' AND buyers.id = cr."organisationId")
  )

WHERE cr."cropName" = ${cropName}
AND (${maxPrice} IS NULL OR cr."priceInPaise" <= ${maxPrice})
AND (${minPrice} IS NULL OR cr."priceInPaise" >= ${minPrice})
GROUP BY buyers.id, buyers.type, buyers.lat, buyers.long
ORDER BY distance ASC
LIMIT 20;
`;
  if (!crops.length)
    throw new ApiError(
      500,
      "something went wrong in fetching crops at the moment",
    );
  return res
    .status(200)
    .json(new ApiResponse(200, crops, "crops fetchd successfully"));
});
export { getCropsOnDistance };
