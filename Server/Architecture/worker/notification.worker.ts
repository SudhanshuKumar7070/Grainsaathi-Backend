import { Worker, Job } from "bullmq";
import redisClient from "../../Config/redis.config.js";
import sse_obj from "../../SSE/sse_store.js";
import prisma from "../../lib/prisma.js";

const notificationWorker = new Worker(
  "notification_queue",
  async (job: Job) => {
    console.log(`Processing job ${job.id}: ${job.name}`);

    if (job.name === "new_registration") {
      const { ticketId, traderId, traderName, orgId, orgName } = job.data;

      await prisma.registrationTaskTicket.update({
        where: { id: ticketId },
        data: { status: "IN_PROGRESS" },
      });

      const entityName = traderName || orgName || "User";
      const entityId = traderId || orgId;

      const payload = {
        message: `New registration pending review (${entityName})`,
        ticketId,
        entityId,
        entityName,
      };

      sse_obj.broadCastToServer("admin_notification", payload);
      console.log("Admin notification sent for ticket:", ticketId);
    }
  },
  {
    connection: redisClient as any,
  }
);

notificationWorker.on("completed", (job: Job) => {
  console.log(`Job ${job.id} has completed!`);
});

notificationWorker.on("failed", async (job: Job | undefined, err: Error) => {
  console.log(`Job ${job?.id} has failed with ${err.message}`);

  if (job?.name === "new_registration" && job.data?.ticketId) {
    try {
      const { ticketId } = job.data;
      await prisma.registrationTaskTicket.update({
        where: { id: ticketId },
        data: { status: "FAILED" },
      });
      console.log(
        `Ticket ${ticketId} marked as FAILED in DB after exhausting retries.`
      );
    } catch (dbErr) {
      console.error("Error updating ticket failure status:", dbErr);
    }
  }
});

export default notificationWorker;
