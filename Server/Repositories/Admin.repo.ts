import prisma from "../lib/prisma.js";
import { TicketStatus, SenderRole, ContractStatus, SellContractStatus } from "@prisma/client";

export class AdminRepo {
  async getRegistrationTickets(page: number, limit: number, status?: TicketStatus) {
    const where = status ? { status } : {};
    const tickets = await prisma.registrationTaskTicket.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        vyapari: { select: { name: true, phone: true, email: true } },
        org: { select: { name: true, phone: true, email: true } },
      },
    });

    const total = await prisma.registrationTaskTicket.count({ where });

    return { tickets, total, page, limit };
  }

  async getTicketById(ticketId: number) {
    return prisma.registrationTaskTicket.findUnique({
      where: { id: ticketId },
      include: {
        vyapari: true,
        org: true,
      },
    });
  }

  async updateTicketStatus(ticketId: number, status: TicketStatus, adminId: number) {
    return prisma.registrationTaskTicket.update({
      where: { id: ticketId },
      data: { status, employeeId: adminId },
    });
  }

  async updateUserStatus(userId: number, role: SenderRole, isActive: boolean) {
    const deletedAt = isActive ? null : new Date();
    
    if (role === "VYAPARI") {
      return prisma.vyapari.update({
        where: { id: userId },
        data: { deleted_At: deletedAt },
      });
    } else if (role === "ORGANISATION") {
      return prisma.organisation.update({
        where: { id: userId },
        data: { deleted_At: deletedAt },
      });
    } else if (role === "KISAAN") {
      return prisma.kisaan.update({
        where: { id: userId },
        data: { deleted_At: deletedAt },
      });
    }
    throw new Error("Invalid role");
  }

  async moderateCrop(cropId: number) {
    return prisma.crops.update({
      where: { id: cropId },
      data: { deletedAt: new Date() },
    });
  }

  async moderateGsContract(contractId: number) {
    return prisma.gsContract.update({
      where: { id: contractId },
      data: { status: ContractStatus.CANCELLED },
    });
  }

  async moderateSellContract(contractId: number) {
    return prisma.sellContract.update({
      where: { id: contractId },
      data: { status: SellContractStatus.CANCELLED },
    });
  }
}
