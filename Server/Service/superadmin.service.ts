import { SuperAdminRepo } from "../Repositories/SuperAdmin.repo.js";
import { generateGsLoginId } from "../utils/gsLoginGenerator.js";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";

const repo = new SuperAdminRepo();

export class SuperAdminService {
  async createAdmin(name: string, email: string, phone: string, passwordPlain: string, superAdminId: number) {
    const hashedPassword = await bcrypt.hash(passwordPlain, 10);
    
    // create the admin first to get an ID
    const newAdmin = await repo.createAdmin({
      name,
      email,
      phone,
      password: hashedPassword,
      createdBy: superAdminId,
      role: "ADMIN"
    });

    const gsLoginId = generateGsLoginId("admin", newAdmin.id);
    
    // update with gsLoginId
    await prisma.admin.update({
      where: { id: newAdmin.id },
      data: { gsLoginId }
    });

    return { ...newAdmin, gsLoginId };
  }

  async deactivateAdmin(adminId: number) {
    return repo.deactivateAdmin(adminId);
  }

  async listAdmins() {
    return repo.listAdmins();
  }

  async getPlatformAnalytics() {
    return repo.getPlatformAnalytics();
  }
}
