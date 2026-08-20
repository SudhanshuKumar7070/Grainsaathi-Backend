import prisma from "../lib/prisma.js";

export class SuperAdminRepo {
  async createAdmin(data: any) {
    return prisma.admin.create({
      data,
      select: { id: true, name: true, email: true, phone: true, gsLoginId: true, role: true, isActive: true },
    });
  }

  async deactivateAdmin(adminId: number) {
    return prisma.admin.update({
      where: { id: adminId },
      data: { isActive: false },
      select: { id: true, name: true, email: true, gsLoginId: true, isActive: true },
    });
  }

  async listAdmins() {
    return prisma.admin.findMany({
      select: { id: true, name: true, email: true, phone: true, gsLoginId: true, role: true, isActive: true, createdAt: true },
    });
  }

  async getPlatformAnalytics() {
    const totalGsContracts = await prisma.gsContract.count();
    const totalSellContracts = await prisma.sellContract.count();
    const completedSellContracts = await prisma.sellContract.count({
      where: { status: "COMPLETED" },
    });

    const latestGsContracts = await prisma.gsContract.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    const latestSellContracts = await prisma.sellContract.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return {
      totalGsContracts,
      totalSellContracts,
      completedSellContracts,
      latestGsContracts,
      latestSellContracts,
    };
  }
}
