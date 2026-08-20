import { Redis } from "ioredis";

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

redisClient.on("connect", () => {
  console.log("redis connected sucessfully!");
});

redisClient.on("error", (err: any) => {
  console.log("error occured in redis connection", err);
});

export default redisClient;
