import { Request, Response } from "express";
import client from "../Config/twilio.config.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { AsyncHandler } from "../utils/AsynHandler.js";
import { generateOTP } from "../utils/otpGenarator.js";
import redisClient from "../Config/redis.config.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import sseObj from "../SSE/sse_store.js";
import notificationQueue from "../Architecture/queue/notification.queue.js";

const twilio_service_id = process.env.TWILIO_SERVICE_SID;

const sendOtpMessage = async (to: string, body: string) => {
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
};

const sendOtp = async (phoneNumber: string) => {
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

  const sampleBody = `Your OTP is ${otp}. Valid for 5 minutes.`;
  const is_otp_sent = await sendOtpMessage(phoneNumber, sampleBody);
  if (!is_otp_sent) throw new ApiError(500, "failed to send otp");

  return { message: "success" };
};

const send_register_otp = AsyncHandler(async (req: Request, res: Response) => {
  const phoneNumber = req.body.phoneNumber;
  if (!phoneNumber) throw new ApiError(400, "missing phone number");

  const user = await prisma.kisaan.findUnique({
    where: { phone: phoneNumber },
  });

  if (user) throw new ApiError(409, "user already exists");

  const is_otp_sent = await sendOtp(phoneNumber);
  if (!is_otp_sent)
    throw new ApiError(500, "something went wrong in sending otp");

  return res
    .status(200)
    .json(new ApiResponse(200, null, "otp sent successfully"));
});

const verifyRegisterOtp = AsyncHandler(async (req: Request, res: Response) => {
  const private_key = process.env.JWT_PRIVATE_KEY!;

  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp)
    throw new ApiError(400, "missing phone number or otp at verify otp api");

  const result = await redisClient.hgetall(`phoneNumber:${phoneNumber}`);
  if (!result.hash) throw new ApiError(400, "otp expired");

  const otpAttempts = result.attempts;
  if (Number(otpAttempts) >= 5) throw new ApiError(429, "OTP blocked");

  const isOtpMatched = await bcrypt.compare(otp, result.hash);
  if (!isOtpMatched) {
    await redisClient.hincrby(`phoneNumber:${phoneNumber}`, "attempts", 1);
    throw new ApiError(400, "invalid otp");
  }

  await redisClient.del(`phoneNumber:${phoneNumber}`);

  const token = jwt.sign({ phoneNumber, purpose: "REGISTER" }, private_key, {
    expiresIn: "5m",
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, token, "otp for registration verified successfully")
    );
});

const send_login_otp = AsyncHandler(async (req: Request, res: Response) => {
  const phoneNumber = req.body.phoneNumber;
  if (!phoneNumber) throw new ApiError(400, "missing phone number");

  const user = await prisma.kisaan.findUnique({
    where: { phone: phoneNumber },
  });

  if (!user)
    throw new ApiError(404, "user not registered ,need to register first");

  const is_otp_sent = await sendOtp(phoneNumber);
  if (!is_otp_sent)
    throw new ApiError(500, "something went wrong in sending otp");

  return res
    .status(200)
    .json(new ApiResponse(200, null, "otp sent successfully"));
});

const verifyLoginOtp = AsyncHandler(async (req: Request, res: Response) => {
  const private_key = process.env.JWT_PRIVATE_KEY!;

  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp)
    throw new ApiError(400, "missing phone number or otp at verify otp api");

  const result = await redisClient.hgetall(`phoneNumber:${phoneNumber}`);
  if (!result.hash) throw new ApiError(400, "otp expired");

  const otpAttempts = result.attempts;
  if (Number(otpAttempts) >= 5) throw new ApiError(429, "OTP blocked");

  const isOtpMatched = await bcrypt.compare(otp, result.hash);
  if (!isOtpMatched) {
    await redisClient.hincrby(`phoneNumber:${phoneNumber}`, "attempts", 1);
    throw new ApiError(400, "invalid otp");
  }

  await redisClient.del(`phoneNumber:${phoneNumber}`);

  const token = jwt.sign({ phoneNumber, purpose: "LOGIN" }, private_key, {
    expiresIn: "5m",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, token, "otp for login verified successfully"));
});

const registerKisaan = AsyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, userAddress } = req.body;

  if ([name, email, password, userAddress].some((el) => !el || !el.trim())) {
    throw new ApiError(400, "all fields are required in register kisan api");
  }

  if (!req.headers.authorization) {
    throw new ApiError(
      401,
      "authorization header is missing from request header in register kisan api"
    );
  }

  const tokenParts = req.headers.authorization.split(" ");
  const token = tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];

  if (!token) {
    throw new ApiError(
      401,
      "token is missing from request header in register kisan api"
    );
  }

  let decodedToken: any;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_PRIVATE_KEY!);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }

  if (decodedToken.purpose !== "REGISTER") {
    throw new ApiError(400, "invalid purpose in token in register kisan api");
  }

  const { phoneNumber } = decodedToken;

  const isExistingUser = await prisma.kisaan.findUnique({
    where: { phone: phoneNumber },
  });

  if (isExistingUser) {
    throw new ApiError(409, "user already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const kisanUser = await prisma.kisaan.create({
    data: {
      name: name,
      email,
      password: hashedPassword,
      phone: phoneNumber,
      address: userAddress,
    },
  });

  if (!kisanUser) {
    throw new ApiError(
      500,
      "something went wrong in register kisan api , kisan user not created"
    );
  }

  const { password: _, refreshToken: __, ...safeKisaanUser } = kisanUser;

  return res
    .status(200)
    .json(new ApiResponse(200, safeKisaanUser, "kisan registered successfully"));
});

const loginKisaan = AsyncHandler(async (req: Request, res: Response) => {
  if (!req.headers.authorization)
    throw new ApiError(401, "authorisation is missing from header");

  const tokenParts = req.headers.authorization.split(" ");
  const verified_otp_token =
    tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];
  if (!verified_otp_token)
    throw new ApiError(401, "otp authorisation token is not available");

  const decoded: any = jwt.verify(
    verified_otp_token,
    process.env.JWT_PRIVATE_KEY!
  );

  if (!decoded) throw new ApiError(401, "invalid user");

  if (decoded.purpose !== "LOGIN")
    throw new ApiError(403, "Invalid OTP token purpose");

  const phoneNumber = decoded.phoneNumber;

  const user = await prisma.kisaan.findUnique({
    where: { phone: phoneNumber },
  });

  if (!user) throw new ApiError(404, "user not exist with phone number");

  const user_id = user.id;

  const refreshToken = jwt.sign(
    { user_id, role: "kisaan" },
    process.env.JWT_TOKEN_PRIVATE_KEY!,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY } as jwt.SignOptions
  );

  const accessToken = jwt.sign(
    { user_id, role: "kisaan" },
    process.env.JWT_TOKEN_PRIVATE_KEY!,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    } as jwt.SignOptions
  );

  await prisma.kisaan.update({
    where: { phone: phoneNumber },
    data: { refreshToken },
  });

  const options = {
    httpOnly: true,
    secure: true,
  };

  sseObj.broadCastToServer("user_login", {
    message: `user ${user.name} login successfull`,
  });

  const { password: _, refreshToken: __, ...safeUser } = user;

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200, safeUser, "user login successfull"));
});

const registerVyapari = AsyncHandler(async (req: Request, res: Response) => {
  const { name, email, address, password, gstNumber } = req.body;
  if ([name, email, address, password].some((el) => !el || !el.trim()))
    throw new ApiError(400, "all fields are required");
  if (!req.headers.authorization)
    throw new ApiError(401, "authorisation is missings from header");
  const tokenParts = req.headers.authorization.split(" ");
  const authToken = tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];
  if (!authToken)
    throw new ApiError(401, "auth token is not available in headers");
  const decodedToken: any = jwt.verify(
    authToken,
    process.env.JWT_PRIVATE_KEY!
  );
  if (!decodedToken) throw new ApiError(401, "token not verified");
  const purpose = decodedToken.purpose;
  if (purpose !== "REGISTER") throw new ApiError(400, "invalid token purpose");
  const phoneNumber = decodedToken.phoneNumber;
  const isExistingUser = await prisma.vyapari.findUnique({
    where: { phone: phoneNumber },
  });
  if (isExistingUser) throw new ApiError(409, "user already exists");
  const hashedPassword = await bcrypt.hash(password, 10);
  const userLocation: any = req.query;
  const lat = userLocation?.lat ? Number(userLocation.lat) : null;
  const long = userLocation?.long ? Number(userLocation.long) : null;
  const { user, ticket } = await prisma.$transaction(async (tx) => {
    const newUser = await tx.vyapari.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        phone: phoneNumber,
        address: address,
        lat: lat,
        long: long,
        gstNumber: gstNumber ? gstNumber : null,
        registrationStatus: "PENDING",
      },
    });

    const newTicket = await tx.registrationTaskTicket.create({
      data: {
        vyapariId: newUser.id,
        status: "PENDING",
      },
    });

    return { user: newUser, ticket: newTicket };
  });

  if (!user) {
    throw new ApiError(500, "error in creating vyapari user");
  }

  try {
    await notificationQueue.add("new_registration", {
      ticketId: ticket.id,
      traderId: user.id,
      traderName: user.name,
    });
  } catch (error) {
    console.error("Failed to enqueue notification task:", error);
  }

  const { password: _, refreshToken: __, ...safeUser } = user;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        safeUser,
        "vyapari registration request made successfully"
      )
    );
});

const loginVyapari = AsyncHandler(async (req: Request, res: Response) => {
  if (!req.headers.authorization)
    throw new ApiError(401, "authorisation is missing from header");

  const tokenParts = req.headers.authorization.split(" ");
  const verified_otp_token =
    tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];
  if (!verified_otp_token)
    throw new ApiError(401, "otp authorisation token is not available");

  const decoded: any = jwt.verify(
    verified_otp_token,
    process.env.JWT_PRIVATE_KEY!
  );

  if (!decoded) throw new ApiError(401, "invalid user");

  if (decoded.purpose !== "LOGIN")
    throw new ApiError(403, "Invalid OTP token purpose");

  const phoneNumber = decoded.phoneNumber;

  const user = await prisma.vyapari.findUnique({
    where: { phone: phoneNumber },
  });

  if (!user) throw new ApiError(404, "user not exist with phone number");

  const user_id = user.id;

  const refreshToken = jwt.sign(
    { user_id, role: "vyapari" },
    process.env.JWT_TOKEN_PRIVATE_KEY!,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY } as jwt.SignOptions
  );

  const accessToken = jwt.sign(
    { user_id, role: "vyapari" },
    process.env.JWT_TOKEN_PRIVATE_KEY!,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    } as jwt.SignOptions
  );

  await prisma.vyapari.update({
    where: { phone: phoneNumber },
    data: { refreshToken },
  });

  const options = {
    httpOnly: true,
    secure: true,
  };

  const { password: _, refreshToken: __, ...safeUser } = user;

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200, safeUser, "user login successfull"));
});

const registerCompany = AsyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, address, gstNumber } = req.body;
  if ([name, email, password, address].some((el) => !el || !el.trim()))
    throw new ApiError(400, "all required fields must be filled");

  if (!req.headers.authorization)
    throw new ApiError(401, "authorisation header is not available");

  const tokenParts = req.headers.authorization.split(" ");
  const authToken = tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];

  const decodedToken: any = jwt.verify(
    authToken,
    process.env.JWT_PRIVATE_KEY!
  );
  if (!decodedToken) throw new ApiError(401, "invalid jwt token");
  if (decodedToken.purpose !== "REGISTER")
    throw new ApiError(400, "invalid token purpose");

  const phoneNumber = decodedToken.phoneNumber;
  const userLocation: any = req.query;
  const lat = userLocation?.lat ? Number(userLocation.lat) : null;
  const long = userLocation?.long ? Number(userLocation.long) : null;

  const isUserExists = await prisma.organisation.findUnique({
    where: {
      phone: phoneNumber,
    },
  });

  if (isUserExists) throw new ApiError(409, "user already exists");

  const hashedPassword = await bcrypt.hash(password, 10);
  const { user, ticket } = await prisma.$transaction(async (tx) => {
    const newUser = await tx.organisation.create({
      data: {
        name: name,
        phone: phoneNumber,
        email: email,
        password: hashedPassword,
        address: address,
        lat: lat,
        long: long,
        gstNumber: gstNumber || null,
        registrationStatus: "PENDING",
      },
    });

    const newTicket = await tx.registrationTaskTicket.create({
      data: {
        orgId: newUser.id,
        status: "PENDING",
      },
    });

    return { user: newUser, ticket: newTicket };
  });

  if (!user) throw new ApiError(500, "error in creating user");

  try {
    await notificationQueue.add("new_registration", {
      ticketId: ticket.id,
      orgId: user.id,
      orgName: user.name,
    });
  } catch (error) {
    console.error("Failed to enqueue notification task:", error);
  }

  const { password: _, refreshToken: __, ...safeUser } = user;

  return res
    .status(200)
    .json(new ApiResponse(200, safeUser, "user created succesfully"));
});

const companyLogin = AsyncHandler(async (req: Request, res: Response) => {
  const password = req.body.password;
  if (!password) throw new ApiError(400, "password required");
  if (!req.headers.authorization)
    throw new ApiError(401, "authorisation token not exists in header");

  const tokenParts = req.headers.authorization.split(" ");
  const authToken = tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];

  const decodedToken: any = jwt.verify(
    authToken,
    process.env.JWT_PRIVATE_KEY!
  );
  if (decodedToken.purpose !== "LOGIN")
    throw new ApiError(400, "invalid token purpose");

  const phoneNumber = decodedToken.phoneNumber;
  const isUserExists = await prisma.organisation.findUnique({
    where: {
      phone: phoneNumber,
    },
  });
  if (!isUserExists)
    throw new ApiError(404, "user not exists you need to register first");
  const is_password_matched = await bcrypt.compare(
    password,
    isUserExists?.password
  );
  if (!is_password_matched) throw new ApiError(401, "invalid password");
  const user_id = isUserExists.id;
  const refreshToken = jwt.sign(
    { user_id, role: "organisation" },
    process.env.JWT_TOKEN_PRIVATE_KEY!,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY } as jwt.SignOptions
  );

  const accessToken = jwt.sign(
    { user_id, role: "organisation" },
    process.env.JWT_TOKEN_PRIVATE_KEY!,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    } as jwt.SignOptions
  );

  await prisma.organisation.update({
    where: { phone: phoneNumber },
    data: { refreshToken },
  });

  const options = {
    httpOnly: true,
    secure: true,
  };

  const { password: _, refreshToken: __, ...safeUser } = isUserExists;

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200, safeUser, "user login successfull"));
});

export {
  send_login_otp,
  send_register_otp,
  verifyLoginOtp,
  verifyRegisterOtp,
  registerKisaan,
  loginKisaan,
  registerVyapari,
  loginVyapari,
  registerCompany,
  companyLogin,
};
