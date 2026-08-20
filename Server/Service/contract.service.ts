import { ContractRepository } from "../Repositories/contract.repo.js";
import { SenderRole, ReceiverRole } from "@prisma/client";
import ApiError from "../utils/ApiError.js";
import notificationQueue from "../Architecture/queue/notification.queue.js";

const repo = new ContractRepository();

export class ContractService {
  async createContract(
    senderId: number,
    senderRole: SenderRole,
    receiverId: number,
    receiverRole: ReceiverRole,
    cropName: string,
    quantity: number,
    pricePerQuintal: number,
    message?: string
  ) {
    if (senderId === receiverId && senderRole === (receiverRole as any)) {
      throw new ApiError(400, "Cannot send a contract to yourself.");
    }

    const totalAmount = quantity * pricePerQuintal;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    const contract = await repo.createGsContract({
      cropName,
      quantity,
      pricePerQuintal,
      totalAmount,
      senderId,
      senderRole,
      receiverId,
      receiverRole,
      expiresAt,
      message,
      status: "PENDING"
    });

    notificationQueue.add("contract_notification", {
      contractId: contract.id,
      receiverId: receiverId,
      receiverRole: receiverRole,
      type: "new_gs_contract",
      title: "New Contract Offer",
      body: `You received a new contract for ${cropName}`,
      cropName,
      senderId,
      senderRole
    });

    return contract;
  }

  async acceptContract(contractId: number, receiverId: number, receiverRole: ReceiverRole) {
    const contract = await repo.findGsContractById(contractId);
    
    if (!contract) throw new ApiError(404, "Contract not found");
    if (contract.receiverId !== receiverId || contract.receiverRole !== receiverRole) {
      throw new ApiError(403, "Not authorized to accept this contract");
    }
    if (contract.status !== "PENDING") {
      throw new ApiError(400, `Contract is already ${contract.status}`);
    }

    const result = await repo.acceptContractTransaction(
      contractId,
      contract.senderId,
      contract.receiverId,
      contract.cropName,
      contract.quantity,
      contract.pricePerQuintal,
      contract.totalAmount
    );

    notificationQueue.add("contract_notification", {
      contractId,
      receiverId: contract.senderId,
      receiverRole: contract.senderRole,
      type: "contract_accepted",
      title: "Contract Accepted",
      body: `Your contract for ${contract.cropName} was accepted.`,
      buyerId: receiverId
    });

    return result;
  }

  async rejectContract(contractId: number, receiverId: number, receiverRole: ReceiverRole) {
    const contract = await repo.findGsContractById(contractId);
    
    if (!contract) throw new ApiError(404, "Contract not found");
    if (contract.receiverId !== receiverId || contract.receiverRole !== receiverRole) {
      throw new ApiError(403, "Not authorized to reject this contract");
    }
    if (contract.status !== "PENDING") {
      throw new ApiError(400, `Contract is already ${contract.status}`);
    }

    const updated = await repo.updateContractStatus(contractId, "REJECTED");

    notificationQueue.add("contract_notification", {
      contractId,
      receiverId: contract.senderId,
      receiverRole: contract.senderRole,
      type: "contract_rejected",
      title: "Contract Rejected",
      body: `Your contract for ${contract.cropName} was rejected.`,
      reason: "Rejected by buyer"
    });

    return updated;
  }

  async getIncomingContracts(receiverId: number, receiverRole: ReceiverRole, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    return repo.getIncomingContracts(receiverId, receiverRole, skip, limit);
  }

  async getSentContracts(senderId: number, senderRole: SenderRole, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    return repo.getSentContracts(senderId, senderRole, skip, limit);
  }

  async cancelContract(contractId: number, senderId: number, senderRole: SenderRole) {
    const contract = await repo.findGsContractById(contractId);
    if (!contract) throw new ApiError(404, "Contract not found");
    if (contract.senderId !== senderId || contract.senderRole !== senderRole) {
      throw new ApiError(403, "Not authorized to cancel this contract");
    }
    if (contract.status !== "PENDING") {
      throw new ApiError(400, `Cannot cancel a contract that is ${contract.status}`);
    }

    return repo.cancelGsContract(contractId);
  }

  async getSellContract(sellContractId: number, userId: number, userRole: string) {
    const sellContract = await repo.getSellContractById(sellContractId);
    if (!sellContract) throw new ApiError(404, "Sell contract not found");
    
    if (sellContract.sellerId !== userId && sellContract.buyerId !== userId) {
      const normalizedRole = userRole.toUpperCase();
      if (normalizedRole !== "ADMIN" && normalizedRole !== "SUPERADMIN" && normalizedRole !== "SUPER_ADMIN") {
        throw new ApiError(403, "Not authorized to view this contract");
      }
    }
    return sellContract;
  }

  async completeContract(sellContractId: number, userId: number) {
    const sellContract = await repo.getSellContractById(sellContractId);
    if (!sellContract) throw new ApiError(404, "Sell contract not found");
    
    if (sellContract.sellerId !== userId && sellContract.buyerId !== userId) {
      throw new ApiError(403, "Not authorized to modify this contract");
    }
    if (sellContract.status !== "ACTIVE") {
      throw new ApiError(400, `Cannot complete a contract that is ${sellContract.status}`);
    }

    return repo.completeSellContract(sellContractId);
  }

  async getSellContracts(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    return repo.getSellContractsByUser(userId, skip, limit);
  }

  async processContractExpirations() {
    const result = await repo.expireContracts();
    if (result.count > 0) {
      console.log(`[CRON] Expired ${result.count} pending contracts.`);
    }
    return result;
  }
}
