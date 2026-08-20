import { Request, Response } from "express";
import { AsyncHandler } from "../utils/AsynHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import prisma from "../lib/prisma.js";
import sseObj from "../SSE/sse_store.js";

const add_crop = AsyncHandler(async (req: Request, res: Response) => {
  const msp = 0;
  if (!req.user || !req.user.id) {
    throw new ApiError(401, "Unauthorized");
  }
  const trader_id = req.user.id;
  if (!trader_id)
    throw new ApiError(400, "trader id is not available at the moment");
  const { cropName, price } = req.body;
  if (!cropName || !price)
    throw new ApiError(
      400,
      "both crop name and price is required for crop listing"
    );
  if (
    typeof cropName !== "string" ||
    cropName.trim().length === 0 ||
    cropName.length > 100
  ) {
    throw new ApiError(400, "Invalid crop name");
  }
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= msp)
    throw new ApiError(400, "invalid price");

  const convertedPrice = parsedPrice * 100;
  const existing = await prisma.crops.findFirst({
    where: { traderId: req.user.id, cropName },
  });

  if (existing) {
    throw new ApiError(409, "Crop already listed");
  }
  const newCrop = await prisma.crops.create({
    data: {
      cropName: cropName,
      traderId: trader_id,
      priceInPaise: convertedPrice,
    },
  });
  if (!newCrop) throw new ApiError(500, "error at crop listing");
  return res
    .status(200)
    .json(new ApiResponse(200, newCrop, "new crop added success fully"));
});

const removeCrop = AsyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.user.id) throw new ApiError(401, "unauhtoried");
  const traderId = req.user.id;
  const cropId = req.params.cropId;
  if (!cropId) throw new ApiError(400, "crop id is not available");
  const parsedId = Number(cropId);
  if (isNaN(parsedId)) throw new ApiError(400, "invalid crop id");
  const existing = await prisma.crops.findFirst({
    where: { id: parsedId, traderId: traderId },
  });
  if (!existing) throw new ApiError(404, "crop doesnot exists");
  const updated = await prisma.crops.update({
    where: { id: parsedId },
    data: { deletedAt: new Date() },
  });
  if (!updated) throw new ApiError(500, "unable to delete crop at moment");
  return res
    .status(200)
    .json(new ApiResponse(200, updated, "crop deleion success"));
});

const getListedCrop = AsyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.params.page) || 1;
  const limit = 20;
  if (!req.user || !req.user?.id)
    throw new ApiError(401, "unauthorised access");
  const userId = req.user.id;
  const crops = await prisma.crops.findMany({
    where: {
      traderId: userId,
      deletedAt: null,
    },
    skip: (page - 1) * limit,
    take: limit,
  });
  if (!crops) throw new ApiError(500, "unable to fetch crops at the moment");
  return res
    .status(200)
    .json(new ApiResponse(200, crops, "crops fetched success fully"));
});

const updateCropPrice = AsyncHandler(async (req: Request, res: Response) => {
  const cropId = req.params.cropId;
  const price = req.body.price;
  if (!cropId) throw new ApiError(400, "crop id is not available");
  const parsedCropId = Number(cropId);
  if (isNaN(parsedCropId)) throw new ApiError(400, "invalid crop id");
  if (!price) throw new ApiError(400, "price is not available");
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice)) throw new ApiError(400, "invalid price");
  if (!req.user || !req.user.id)
    throw new ApiError(401, "unauthorised access");
  const trader_id = req.user.id;

  const updatedPrice = await prisma.crops.update({
    where: {
      id: parsedCropId,
    },
    data: {
      priceInPaise: parsedPrice,
    },
  });
  if (!updatedPrice)
    throw new ApiError(500, "something went wrong in updating price");

  sseObj.broadCastToServer("crop_price_update", {
    message: `crop ${updatedPrice.cropName} price updated.`,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, updatedPrice, "price updated successfully"));
});

export { add_crop, removeCrop, getListedCrop, updateCropPrice };
