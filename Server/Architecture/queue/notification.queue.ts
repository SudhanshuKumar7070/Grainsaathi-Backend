import { Queue } from "bullmq";
import redisClient from "../../Config/redis.config.js";

const notificationQueue = new Queue("notification_queue", {
  connection: redisClient as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export default notificationQueue;
