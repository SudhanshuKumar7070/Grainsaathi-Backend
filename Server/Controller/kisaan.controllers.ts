import { Request, Response } from "express";
import { AsyncHandler } from "../utils/AsynHandler.js";
import prisma from "../lib/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const generateReceipt = AsyncHandler(async (req: Request, res: Response) => {
  const quantity = req.body.quantity;
  if (!quantity) throw new ApiError(400, "invalid quantity");
  if (!req.user || !req.user.id) throw new ApiError(401, "unauthorised access");
  const user_id = req.user.id;
  const crop_id = req.params.cropId;
  if (!crop_id) throw new ApiError(400, "crop id not available at params");
  const parsedCropId = Number(crop_id);
  if (isNaN(parsedCropId)) throw new ApiError(400, "invalid crop id");

  const crop = await prisma.crops.findFirst({
    where: {
      id: parsedCropId,
      deletedAt: null,
    },
  });
  if (!crop) throw new ApiError(404, "no such crop available");
  const cropPrice = crop.priceInPaise;

  const receipt = await prisma.receipt.create({
    data: {
      cropId: parsedCropId,
      cropPrice: cropPrice,
      farmerId: user_id,
      cropQuantity: Number(quantity),
    },
  });
  return res
    .status(200)
    .json(new ApiResponse(200, receipt, "receipt generated successfully"));
});

export { generateReceipt };
