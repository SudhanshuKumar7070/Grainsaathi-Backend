import { Request, Response } from "express";
import { AsyncHandler } from "../utils/AsynHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import prisma from "../lib/prisma.js";
import sseObj from "../SSE/sse_store.js";

const addOrgCrop = AsyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.id;
  const { cropName, priceInPaise, quantityQuintal } = req.body;

  const existing = await prisma.crops.findFirst({
    where: { organisationId: orgId, cropName, deletedAt: null },
  });

  if (existing) {
    throw new ApiError(409, "Crop already listed");
  }
  
  const newCrop = await prisma.crops.create({
    data: {
      cropName,
      organisationId: orgId,
      priceInPaise,
      quantityQuintal: quantityQuintal || null
    },
  });
  
  return res.status(201).json(new ApiResponse(201, newCrop, "Crop added successfully"));
});

const removeOrgCrop = AsyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.id;
  const cropId = Number(req.params.cropId);
  
  if (isNaN(cropId)) throw new ApiError(400, "invalid crop id");

  const existing = await prisma.crops.findFirst({
    where: { id: cropId, organisationId: orgId },
  });
  
  if (!existing) throw new ApiError(404, "crop does not exist");
  
  const updated = await prisma.crops.update({
    where: { id: cropId },
    data: { deletedAt: new Date() },
  });
  
  return res.status(200).json(new ApiResponse(200, updated, "crop deletion success"));
});

const getListedOrgCrop = AsyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = 20;
  const orgId = req.user!.id;
  
  const crops = await prisma.crops.findMany({
    where: {
      organisationId: orgId,
      deletedAt: null,
    },
    skip: (page - 1) * limit,
    take: limit,
  });
  
  return res.status(200).json(new ApiResponse(200, crops, "crops fetched successfully"));
});

const updateOrgCropPrice = AsyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.id;
  const cropId = Number(req.params.cropId);
  const { newPriceInPaise } = req.body;

  const existingCrop = await prisma.crops.findFirst({
    where: { id: cropId, organisationId: orgId, deletedAt: null }
  });
  
  if (!existingCrop) throw new ApiError(404, "Crop not found or already deleted");

  const updatedPrice = await prisma.crops.update({
    where: { id: cropId },
    data: { priceInPaise: newPriceInPaise },
  });

  sseObj.broadCastToServer("crop_price_update", {
    message: `crop ${updatedPrice.cropName} price updated to ${newPriceInPaise} paise.`,
  });
  
  return res.status(200).json(new ApiResponse(200, updatedPrice, "Price updated successfully"));
});

export { addOrgCrop, removeOrgCrop, getListedOrgCrop, updateOrgCropPrice };
