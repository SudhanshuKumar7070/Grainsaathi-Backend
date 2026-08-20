import { z } from "zod";

export const approveRegistrationSchema = z.object({
  params: z.object({
    id: z.string().transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, "Invalid ticket ID"),
  }),
});

export const rejectRegistrationSchema = z.object({
  params: z.object({
    id: z.string().transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, "Invalid ticket ID"),
  }),
  body: z.object({
    reason: z.string().min(3, "Reason must be at least 3 characters").optional(),
  }),
});

export const banUserSchema = z.object({
  params: z.object({
    id: z.string().transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, "Invalid user ID"),
  }),
  body: z.object({
    role: z.enum(["KISAAN", "VYAPARI", "ORGANISATION"]),
  }),
});

export const moderatePostSchema = z.object({
  params: z.object({
    id: z.string().transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, "Invalid post ID"),
  }),
  body: z.object({
    type: z.enum(["CROP", "CONTRACT"]),
  }),
});
