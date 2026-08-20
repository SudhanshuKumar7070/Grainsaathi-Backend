import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import redisClient from "../Config/redis.config.js";
import client from "../Config/twilio.config.js";
import ApiError from "../utils/ApiError.js";
import { generateOTP } from "../utils/otpGenarator.js";

export class AuthService {
  static async sendOtpMessage(to: string, body: string) {
    try {
      const response = await client.messages.create({
        from: process.env.FROM_PHONE_NUMBER,
        body: body,
        to: to,
      });
      return response;
    } catch (err) {
      return false;
    }
  }

  static async sendOtp(phoneNumber: string, purpose: string = "OTP") {
    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp.toString(), 10);

    await redisClient.hset(
      `phoneNumber:${phoneNumber}`,
      "hash",
      hashedOtp,
      "attempts",
      0
    );
    await redisClient.expire(`phoneNumber:${phoneNumber}`, 300);

    const body = `Your ${purpose} is ${otp}. Valid for 5 minutes.`;
    const isSent = await this.sendOtpMessage(phoneNumber, body);
    if (!isSent) throw new ApiError(500, "failed to send otp");

    return { message: "success" };
  }

  static async verifyOtp(phoneNumber: string, otp: string, purpose: string) {
    const private_key = process.env.JWT_PRIVATE_KEY!;
    
    const result = await redisClient.hgetall(`phoneNumber:${phoneNumber}`);
    if (!result.hash) throw new ApiError(400, "otp expired");

    const otpAttempts = Number(result.attempts || 0);
    if (otpAttempts >= 5) throw new ApiError(429, "OTP blocked");

    const isOtpMatched = await bcrypt.compare(otp, result.hash);
    if (!isOtpMatched) {
      await redisClient.hincrby(`phoneNumber:${phoneNumber}`, "attempts", 1);
      throw new ApiError(400, "invalid otp");
    }

    await redisClient.del(`phoneNumber:${phoneNumber}`);

    const token = jwt.sign({ phoneNumber, purpose }, private_key, {
      expiresIn: "5m",
    });

    return token;
  }

  static generateTokenPair(user_id: number, role: string) {
    const refreshToken = jwt.sign(
      { user_id, role },
      process.env.JWT_TOKEN_PRIVATE_KEY!,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY } as jwt.SignOptions
    );

    const accessToken = jwt.sign(
      { user_id, role },
      process.env.JWT_TOKEN_PRIVATE_KEY!,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  static async hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
  }

  static async comparePassword(plain: string, hashed: string) {
    return await bcrypt.compare(plain, hashed);
  }
}
