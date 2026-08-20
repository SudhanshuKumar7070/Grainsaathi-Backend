import { Request, Response, NextFunction } from "express";
import redisClient from "../Config/redis.config.js";
import ApiError from "../utils/ApiError.js";

const RATE_LIMIT_DURATION_IN_SECONDS = 60;
const NUMBER_OF_REQUESTS_ALLOWED = 3;
const OTP_TTL_IN_SECONDS = 300;

const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const currentTime = Date.now();
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    throw new ApiError(400, "phone number is required ");
  }

  const result = await redisClient.hgetall(`otpRL:${phoneNumber}`);
  if (Object.keys(result).length === 0) {
    await redisClient.hset(`otpRL:${phoneNumber}`, {
      createdAt: currentTime,
      count: 1,
    });
    await redisClient.expire(`otpRL:${phoneNumber}`, OTP_TTL_IN_SECONDS);
    return next();
  }

  const timeDiff = currentTime - Number(result["createdAt"]);
  if (timeDiff < RATE_LIMIT_DURATION_IN_SECONDS * 1000) {
    if (Number(result["count"]) < NUMBER_OF_REQUESTS_ALLOWED) {
      await redisClient.hset(`otpRL:${phoneNumber}`, {
        count: Number(result["count"]) + 1,
      });
      return next();
    } else {
      return res
        .status(429)
        .json({ message: "rate limit exceeded", success: false, statusCode: 429 });
    }
  } else {
    await redisClient.hset(`otpRL:${phoneNumber}`, {
      createdAt: currentTime,
      count: 1,
    });
    await redisClient.expire(`otpRL:${phoneNumber}`, OTP_TTL_IN_SECONDS);
    return next();
  }
};

export { rateLimiter };
