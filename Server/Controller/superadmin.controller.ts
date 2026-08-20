import { Request, Response } from "express";
import { AsyncHandler } from "../utils/AsynHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { SuperAdminService } from "../Service/superadmin.service.js";

const service = new SuperAdminService();

export const createAdmin = AsyncHandler(async (req: Request, res: Response) => {
  const superAdminId = req.user!.id;
  const { name, email, phone, password } = req.body;
  
  const admin = await service.createAdmin(name, email, phone, password, superAdminId);
  return res.status(201).json(new ApiResponse(201, admin, "Admin created successfully"));
});

export const deactivateAdmin = AsyncHandler(async (req: Request, res: Response) => {
  const adminId = Number(req.params.id);
  
  const admin = await service.deactivateAdmin(adminId);
  return res.status(200).json(new ApiResponse(200, admin, "Admin deactivated successfully"));
});

export const listAdmins = AsyncHandler(async (req: Request, res: Response) => {
  const admins = await service.listAdmins();
  return res.status(200).json(new ApiResponse(200, admins, "Admins fetched successfully"));
});

export const getAnalytics = AsyncHandler(async (req: Request, res: Response) => {
  const analytics = await service.getPlatformAnalytics();
  return res.status(200).json(new ApiResponse(200, analytics, "Platform analytics fetched successfully"));
});
