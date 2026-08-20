import { Request, Response } from "express";
import { AsyncHandler } from "../utils/AsynHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { ContractService } from "../Service/contract.service.js";
import { SenderRole, ReceiverRole } from "@prisma/client";

const service = new ContractService();

const createContractController = AsyncHandler(async (req: Request, res: Response) => {
  const { cropName, quantity, pricePerQuintal, receiverId, receiverRole, message } = req.body;
  const senderId = req.user!.id;
  const senderRole = req.userRole!.toUpperCase() as SenderRole;

  const contract = await service.createContract(
    senderId,
    senderRole,
    receiverId,
    receiverRole as ReceiverRole,
    cropName,
    quantity,
    pricePerQuintal,
    message
  );

  return res.status(201).json(new ApiResponse(201, contract, "Contract proposal created and sent successfully"));
});

const acceptContractController = AsyncHandler(async (req: Request, res: Response) => {
  const contractId = Number(req.params.id);
  const receiverId = req.user!.id;
  const receiverRole = req.userRole!.toUpperCase() as ReceiverRole;

  const result = await service.acceptContract(contractId, receiverId, receiverRole);

  return res.status(200).json(new ApiResponse(200, result, "Contract accepted and SellContract generated successfully"));
});

const rejectContractController = AsyncHandler(async (req: Request, res: Response) => {
  const contractId = Number(req.params.id);
  const receiverId = req.user!.id;
  const receiverRole = req.userRole!.toUpperCase() as ReceiverRole;

  const result = await service.rejectContract(contractId, receiverId, receiverRole);

  return res.status(200).json(new ApiResponse(200, result, "Contract rejected successfully"));
});

const getIncomingContractsController = AsyncHandler(async (req: Request, res: Response) => {
  const receiverId = req.user!.id;
  const receiverRole = req.userRole!.toUpperCase() as ReceiverRole;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const contracts = await service.getIncomingContracts(receiverId, receiverRole, page, limit);

  return res.status(200).json(new ApiResponse(200, contracts, "Incoming contracts fetched successfully"));
});

const getSentContractsController = AsyncHandler(async (req: Request, res: Response) => {
  const senderId = req.user!.id;
  const senderRole = req.userRole!.toUpperCase() as SenderRole;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const contracts = await service.getSentContracts(senderId, senderRole, page, limit);

  return res.status(200).json(new ApiResponse(200, contracts, "Sent contracts fetched successfully"));
});

export {
  createContractController,
  acceptContractController,
  rejectContractController,
  getIncomingContractsController,
  getSentContractsController
};
