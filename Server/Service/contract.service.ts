import { ContractRepository } from "../Repositories/contract.repo.js";
import { SenderRole, ReceiverRole } from "@prisma/client";
import ApiError from "../utils/ApiError.js";
import sseObj from "../SSE/sse_store.js";

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

    sseObj.sendToClient(receiverId.toString(), {
      event: "new_gs_contract",
      data: { contractId: contract.id, cropName, senderId, senderRole }
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

    sseObj.sendToClient(contract.senderId.toString(), {
      event: "contract_accepted",
      data: { contractId, buyerId: receiverId }
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

    sseObj.sendToClient(contract.senderId.toString(), {
      event: "contract_rejected",
      data: { contractId, reason: "Rejected by buyer" }
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
}
