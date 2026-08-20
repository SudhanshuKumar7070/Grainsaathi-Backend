import { z } from "zod";

export const registerKisaanSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email").optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
    lat: z.number().optional(),
    long: z.number().optional(),
  }),
});

export const loginKisaanSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
    otp: z.string().length(6, "OTP must be 6 digits"),
  }),
});

export const registerVyapariSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
    lat: z.number().optional(),
    long: z.number().optional(),
    gstNumber: z.string().optional(),
  }),
});

export const registerOrganisationSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
    lat: z.number().optional(),
    long: z.number().optional(),
    gstNumber: z.string().optional(),
  }),
});

export const gsLoginSchema = z.object({
  body: z.object({
    gsLoginId: z.string().min(5, "gsLoginId is required"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const superAdminLoginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const createAdminSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  }),
});
