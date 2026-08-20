import { z } from "zod";

export const createAdminSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name is required"),
    phone: z.string().min(10, "Valid phone number is required"),
    email: z.string().email("Valid email is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
});

export const deactivateAdminSchema = z.object({
  params: z.object({
    id: z.string().transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, "Invalid admin ID"),
  }),
});
