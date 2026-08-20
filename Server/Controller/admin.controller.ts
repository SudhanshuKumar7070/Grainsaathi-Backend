import { Request, Response } from "express";
import { AsyncHandler } from "../utils/AsynHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { AdminService } from "../Service/admin.service.js";
import { TicketStatus, SenderRole } from "@prisma/client";

const service = new AdminService();

export const getTickets = AsyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const status = req.query.status as TicketStatus;

  const result = await service.getTickets(page, limit, status);
  return res.status(200).json(new ApiResponse(200, result, "Tickets fetched successfully"));
});

export const getTicketById = AsyncHandler(async (req: Request, res: Response) => {
  const ticketId = Number(req.params.id);
  const ticket = await service.getTicketById(ticketId);
  return res.status(200).json(new ApiResponse(200, ticket, "Ticket fetched successfully"));
});

export const approveRegistration = AsyncHandler(async (req: Request, res: Response) => {
  const ticketId = Number(req.params.id);
  const adminId = req.user!.id;
  
  const result = await service.approveRegistration(ticketId, adminId);
  return res.status(200).json(new ApiResponse(200, result, result.message));
});

export const rejectRegistration = AsyncHandler(async (req: Request, res: Response) => {
  const ticketId = Number(req.params.id);
  const adminId = req.user!.id;
  const { reason } = req.body;
  
  const result = await service.rejectRegistration(ticketId, adminId, reason);
  return res.status(200).json(new ApiResponse(200, result, result.message));
});

export const banUser = AsyncHandler(async (req: Request, res: Response) => {
  const userId = Number(req.params.id);
  const { role } = req.body;
  
  await service.banUser(userId, role as SenderRole);
  return res.status(200).json(new ApiResponse(200, null, "User banned successfully"));
});

export const unbanUser = AsyncHandler(async (req: Request, res: Response) => {
  const userId = Number(req.params.id);
  const { role } = req.body;
  
  await service.unbanUser(userId, role as SenderRole);
  return res.status(200).json(new ApiResponse(200, null, "User unbanned successfully"));
});

export const moderatePost = AsyncHandler(async (req: Request, res: Response) => {
  const postId = Number(req.params.id);
  const { type } = req.body;
  
  await service.moderatePost(postId, type as "CROP" | "CONTRACT");
  return res.status(200).json(new ApiResponse(200, null, "Post moderated successfully"));
});
