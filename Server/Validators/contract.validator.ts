import { z } from "zod";

export const createContractSchema = z.object({
  body: z.object({
    cropName: z.string().min(2, "Crop name is required"),
    quantity: z.number().positive("Quantity must be a positive number"),
    pricePerQuintal: z.number().int().positive("Price must be a positive integer"),
    receiverId: z.number().int().positive("Valid receiver ID is required"),
    receiverRole: z.enum(["VYAPARI", "ORGANISATION"]),
    message: z.string().optional(),
  }),
});

export const contractActionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number").transform(Number)
  })
});

export const cancelContractSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number").transform(Number)
  })
});

export const sellContractParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number").transform(Number)
  })
});

export const getContractsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform(val => val ? Number(val) : 1),
    limit: z.string().optional().transform(val => val ? Number(val) : 20)
  })
});

export const acceptContractSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Contract ID must be a valid number"),
  }),
});

export const rejectContractSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Contract ID must be a valid number"),
  }),
});
