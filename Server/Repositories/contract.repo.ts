import prisma from "../lib/prisma.js";
import { Prisma, ContractStatus, SenderRole, ReceiverRole, SellContractStatus } from "@prisma/client";

export class ContractRepository {
  async createGsContract(data: Prisma.GsContractUncheckedCreateInput) {
    return prisma.gsContract.create({ data });
  }

  async findGsContractById(id: number) {
    return prisma.gsContract.findUnique({
      where: { id },
      include: {
        sellContract: true
      }
    });
  }

  async acceptContractTransaction(
    contractId: number,
    sellerId: number,
    buyerId: number,
    cropName: string,
    quantity: number,
    pricePerQuintal: number,
    totalAmount: number
  ) {
    return prisma.$transaction(async (tx) => {
      const updatedGsContract = await tx.gsContract.update({
        where: { id: contractId },
        data: { status: "ACCEPTED" }
      });

      const newSellContract = await tx.sellContract.create({
        data: {
          gsContractId: contractId,
          cropName,
          quantity,
          pricePerQuintal,
          totalAmount,
          sellerId,
          buyerId,
          status: "ACTIVE"
        }
      });

      const gsContract = await tx.gsContract.findUnique({ where: { id: contractId } });
      
      if (gsContract && gsContract.senderRole !== "KISAAN") {
        await tx.chatRoom.create({
          data: {
            sellContractId: newSellContract.id
          }
        });
      }

      return { updatedGsContract, newSellContract };
    });
  }

  async updateContractStatus(id: number, status: ContractStatus) {
    return prisma.gsContract.update({
      where: { id },
      data: { status }
    });
  }

  async getIncomingContracts(receiverId: number, receiverRole: ReceiverRole, skip: number, take: number) {
    return prisma.gsContract.findMany({
      where: { receiverId, receiverRole },
      orderBy: { createdAt: "desc" },
      skip,
      take
    });
  }

  async getSentContracts(senderId: number, senderRole: SenderRole, skip: number, take: number) {
    return prisma.gsContract.findMany({
      where: { senderId, senderRole },
      orderBy: { createdAt: "desc" },
      skip,
      take
    });
  }

  async cancelGsContract(id: number) {
    return prisma.gsContract.update({
      where: { id },
      data: { status: "CANCELLED" }
    });
  }

  async expireContracts() {
    return prisma.gsContract.updateMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" }
    });
  }

  async getSellContractById(id: number) {
    return prisma.sellContract.findUnique({
      where: { id },
      include: {
        gsContract: true,
        chatRooms: true
      }
    });
  }

  async completeSellContract(id: number) {
    return prisma.sellContract.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() }
    });
  }

  async getSellContractsByUser(userId: number, skip: number, take: number) {
    return prisma.sellContract.findMany({
      where: {
        OR: [
          { sellerId: userId },
          { buyerId: userId }
        ]
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        gsContract: true
      }
    });
  }
}
