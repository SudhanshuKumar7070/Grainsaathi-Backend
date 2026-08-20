import { AdminRepo } from "../Repositories/Admin.repo.js";
import { generateGsLoginId } from "../utils/gsLoginGenerator.js";
import notificationQueue from "../Architecture/queue/notification.queue.js";
import crypto from "crypto";
import { TicketStatus, SenderRole } from "@prisma/client";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";

const repo = new AdminRepo();

export class AdminService {
  async getTickets(page: number, limit: number, status?: TicketStatus) {
    return repo.getRegistrationTickets(page, limit, status);
  }

  async getTicketById(ticketId: number) {
    const ticket = await repo.getTicketById(ticketId);
    if (!ticket) throw new Error("Ticket not found");
    return ticket;
  }

  async approveRegistration(ticketId: number, adminId: number) {
    const ticket = await repo.getTicketById(ticketId);
    if (!ticket) throw new Error("Ticket not found");
    if (ticket.status === TicketStatus.RESOLVED) throw new Error("Ticket already resolved");

    // Generate credentials
    const password = crypto.randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let gsLoginId = "";
    let userPhone = "";
    let userId = 0;
    
    if (ticket.vyapariId) {
      userId = ticket.vyapariId;
      gsLoginId = generateGsLoginId("vyapari", userId);
      userPhone = ticket.vyapari!.phone;
      await prisma.vyapari.update({
        where: { id: userId },
        data: { gsLoginId, gsPassword: hashedPassword, registrationStatus: "ACCEPTED" },
      });
    } else if (ticket.orgId) {
      userId = ticket.orgId;
      gsLoginId = generateGsLoginId("organisation", userId);
      userPhone = ticket.org!.phone;
      await prisma.organisation.update({
        where: { id: userId },
        data: { gsLoginId, gsPassword: hashedPassword, registrationStatus: "ACCEPTED" },
      });
    } else {
      throw new Error("Invalid ticket association");
    }

    await repo.updateTicketStatus(ticketId, TicketStatus.RESOLVED, adminId);

    await notificationQueue.add("registration_approved", {
      userId,
      gsLoginId,
      password,
      phone: userPhone,
    });

    return { gsLoginId, message: "Registration approved, credentials dispatched." };
  }

  async rejectRegistration(ticketId: number, adminId: number, reason?: string) {
    const ticket = await repo.getTicketById(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    if (ticket.vyapariId) {
      await prisma.vyapari.update({ where: { id: ticket.vyapariId }, data: { registrationStatus: "REJECTED" }});
    } else if (ticket.orgId) {
      await prisma.organisation.update({ where: { id: ticket.orgId }, data: { registrationStatus: "REJECTED" }});
    }

    await repo.updateTicketStatus(ticketId, TicketStatus.REJECTED, adminId);

    return { message: "Registration rejected." };
  }

  async banUser(userId: number, role: SenderRole) {
    return repo.updateUserStatus(userId, role, false);
  }

  async unbanUser(userId: number, role: SenderRole) {
    return repo.updateUserStatus(userId, role, true);
  }

  async moderatePost(postId: number, type: "CROP" | "CONTRACT") {
    if (type === "CROP") {
      return repo.moderateCrop(postId);
    } else {
      return repo.moderateGsContract(postId);
    }
  }
}
