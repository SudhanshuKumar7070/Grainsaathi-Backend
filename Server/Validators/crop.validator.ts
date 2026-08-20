import { z } from "zod";

export const addCropSchema = z.object({
  body: z.object({
    cropName: z.string().min(2, "Crop name is required"),
    priceInPaise: z.number().int().positive("Price must be a positive integer"),
    quantityQuintal: z.number().positive("Quantity must be a positive number").optional(),
  }),
});

export const updateCropPriceSchema = z.object({
  body: z.object({
    cropId: z.number().int().positive("Valid Crop ID is required"),
    newPriceInPaise: z.number().int().positive("Price must be a positive integer"),
  }),
});

export const removeCropSchema = z.object({
  params: z.object({
    cropId: z.string().regex(/^\d+$/, "Crop ID must be a valid number"),
  }),
});
