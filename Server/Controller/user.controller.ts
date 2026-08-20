import { Request, Response } from "express";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { AsyncHandler } from "../utils/AsynHandler.js";
import { AuthService } from "../Service/auth.service.js";
import prisma from "../lib/prisma.js";
import sseObj from "../SSE/sse_store.js";
import notificationQueue from "../Architecture/queue/notification.queue.js";
import jwt from "jsonwebtoken";
import { generateGsLoginId } from "../utils/gsLoginGenerator.js";

const send_register_otp = AsyncHandler(async (req: Request, res: Response) => {
  const phoneNumber = req.body.phoneNumber;
  if (!phoneNumber) throw new ApiError(400, "missing phone number");

  const user = await prisma.kisaan.findUnique({ where: { phone: phoneNumber } });
  if (user) throw new ApiError(409, "user already exists");

  await AuthService.sendOtp(phoneNumber, "REGISTER");
  return res.status(200).json(new ApiResponse(200, null, "otp sent successfully"));
});

const verifyRegisterOtp = AsyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) throw new ApiError(400, "missing phone number or otp");

  const token = await AuthService.verifyOtp(phoneNumber, otp, "REGISTER");
  return res.status(200).json(new ApiResponse(200, token, "otp for registration verified successfully"));
});

const send_login_otp = AsyncHandler(async (req: Request, res: Response) => {
  const phoneNumber = req.body.phoneNumber;
  if (!phoneNumber) throw new ApiError(400, "missing phone number");

  const user = await prisma.kisaan.findUnique({ where: { phone: phoneNumber } });
  if (!user) throw new ApiError(404, "user not registered ,need to register first");

  await AuthService.sendOtp(phoneNumber, "LOGIN");
  return res.status(200).json(new ApiResponse(200, null, "otp sent successfully"));
});

const verifyLoginOtp = AsyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) throw new ApiError(400, "missing phone number or otp");

  const token = await AuthService.verifyOtp(phoneNumber, otp, "LOGIN");
  return res.status(200).json(new ApiResponse(200, token, "otp for login verified successfully"));
});

const registerKisaan = AsyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, userAddress } = req.body;

  if ([name, email, password, userAddress].some((el) => !el || !el.trim())) {
    throw new ApiError(400, "all fields are required");
  }

  if (!req.headers.authorization) throw new ApiError(401, "authorization header missing");
  const tokenParts = req.headers.authorization.split(" ");
  const token = tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];

  let decodedToken: any;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_PRIVATE_KEY!);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }

  if (decodedToken.purpose !== "REGISTER") throw new ApiError(400, "invalid purpose in token");

  const { phoneNumber } = decodedToken;
  const isExistingUser = await prisma.kisaan.findUnique({ where: { phone: phoneNumber } });
  if (isExistingUser) throw new ApiError(409, "user already exists");

  const hashedPassword = await AuthService.hashPassword(password);
  const kisanUser = await prisma.kisaan.create({
    data: { name, email, password: hashedPassword, phone: phoneNumber, address: userAddress },
  });

  const { password: _, refreshToken: __, ...safeKisaanUser } = kisanUser;
  return res.status(200).json(new ApiResponse(200, safeKisaanUser, "kisan registered successfully"));
});

const loginKisaan = AsyncHandler(async (req: Request, res: Response) => {
  if (!req.headers.authorization) throw new ApiError(401, "authorisation is missing from header");
  const tokenParts = req.headers.authorization.split(" ");
  const verified_otp_token = tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];

  const decoded: any = jwt.verify(verified_otp_token, process.env.JWT_PRIVATE_KEY!);
  if (decoded.purpose !== "LOGIN") throw new ApiError(403, "Invalid OTP token purpose");

  const phoneNumber = decoded.phoneNumber;
  const user = await prisma.kisaan.findUnique({ where: { phone: phoneNumber } });
  if (!user) throw new ApiError(404, "user not exist with phone number");

  const { accessToken, refreshToken } = AuthService.generateTokenPair(user.id, "kisaan");

  await prisma.kisaan.update({ where: { phone: phoneNumber }, data: { refreshToken } });

  sseObj.broadCastToServer("user_login", { message: `user ${user.name} login successfull` });

  const { password: _, refreshToken: __, ...safeUser } = user;
  const options = { httpOnly: true, secure: true };
  return res.status(200).cookie("refreshToken", refreshToken, options).cookie("accessToken", accessToken, options).json(new ApiResponse(200, safeUser, "user login successfull"));
});

const registerVyapari = AsyncHandler(async (req: Request, res: Response) => {
  const { name, email, address, password, gstNumber } = req.body;
  if ([name, email, address, password].some((el) => !el || !el.trim())) throw new ApiError(400, "all fields are required");
  
  if (!req.headers.authorization) throw new ApiError(401, "authorisation is missing");
  const tokenParts = req.headers.authorization.split(" ");
  const authToken = tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];
  
  const decodedToken: any = jwt.verify(authToken, process.env.JWT_PRIVATE_KEY!);
  if (decodedToken.purpose !== "REGISTER") throw new ApiError(400, "invalid token purpose");
  
  const phoneNumber = decodedToken.phoneNumber;
  const isExistingUser = await prisma.vyapari.findUnique({ where: { phone: phoneNumber } });
  if (isExistingUser) throw new ApiError(409, "user already exists");
  
  const hashedPassword = await AuthService.hashPassword(password);
  const userLocation: any = req.query;
  const lat = userLocation?.lat ? Number(userLocation.lat) : null;
  const long = userLocation?.long ? Number(userLocation.long) : null;
  
  const { user, ticket } = await prisma.$transaction(async (tx) => {
    const newUser = await tx.vyapari.create({
      data: { name, email, password: hashedPassword, phone: phoneNumber, address, lat, long, gstNumber: gstNumber || null, registrationStatus: "PENDING" },
    });
    const newTicket = await tx.registrationTaskTicket.create({ data: { vyapariId: newUser.id, status: "PENDING" } });
    return { user: newUser, ticket: newTicket };
  });

  try {
    await notificationQueue.add("new_registration", { ticketId: ticket.id, traderId: user.id, traderName: user.name });
  } catch (error) {
    console.error("Failed to enqueue notification task:", error);
  }

  const { password: _, refreshToken: __, ...safeUser } = user;
  return res.status(200).json(new ApiResponse(200, safeUser, "vyapari registration request made successfully"));
});

const loginVyapari = AsyncHandler(async (req: Request, res: Response) => {
  const { gsLoginId, password } = req.body;
  if (!gsLoginId || !password) throw new ApiError(400, "gsLoginId and password are required");

  const user = await prisma.vyapari.findUnique({ where: { gsLoginId } });
  if (!user) throw new ApiError(404, "Invalid gsLoginId");

  if (user.registrationStatus !== "ACCEPTED") throw new ApiError(403, "Account pending admin approval");

  const isMatched = await AuthService.comparePassword(password, user.password || "");
  if (!isMatched) throw new ApiError(401, "Invalid password");

  const { accessToken, refreshToken } = AuthService.generateTokenPair(user.id, "vyapari");
  await prisma.vyapari.update({ where: { id: user.id }, data: { refreshToken } });

  const { password: _, refreshToken: __, ...safeUser } = user;
  const options = { httpOnly: true, secure: true };
  return res.status(200).cookie("refreshToken", refreshToken, options).cookie("accessToken", accessToken, options).json(new ApiResponse(200, safeUser, "vyapari login successfull"));
});

const registerCompany = AsyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, address, gstNumber } = req.body;
  if ([name, email, password, address].some((el) => !el || !el.trim())) throw new ApiError(400, "all required fields must be filled");

  if (!req.headers.authorization) throw new ApiError(401, "authorisation header is not available");
  const tokenParts = req.headers.authorization.split(" ");
  const authToken = tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];

  const decodedToken: any = jwt.verify(authToken, process.env.JWT_PRIVATE_KEY!);
  if (decodedToken.purpose !== "REGISTER") throw new ApiError(400, "invalid token purpose");

  const phoneNumber = decodedToken.phoneNumber;
  const isUserExists = await prisma.organisation.findUnique({ where: { phone: phoneNumber } });
  if (isUserExists) throw new ApiError(409, "user already exists");

  const hashedPassword = await AuthService.hashPassword(password);
  const userLocation: any = req.query;
  const lat = userLocation?.lat ? Number(userLocation.lat) : null;
  const long = userLocation?.long ? Number(userLocation.long) : null;

  const { user, ticket } = await prisma.$transaction(async (tx) => {
    const newUser = await tx.organisation.create({
      data: { name, phone: phoneNumber, email, password: hashedPassword, address, lat, long, gstNumber: gstNumber || null, registrationStatus: "PENDING" },
    });
    const newTicket = await tx.registrationTaskTicket.create({ data: { orgId: newUser.id, status: "PENDING" } });
    return { user: newUser, ticket: newTicket };
  });

  try {
    await notificationQueue.add("new_registration", { ticketId: ticket.id, orgId: user.id, orgName: user.name });
  } catch (error) {
    console.error("Failed to enqueue notification task:", error);
  }

  const { password: _, refreshToken: __, ...safeUser } = user;
  return res.status(200).json(new ApiResponse(200, safeUser, "company created succesfully"));
});

const companyLogin = AsyncHandler(async (req: Request, res: Response) => {
  const { gsLoginId, password } = req.body;
  if (!gsLoginId || !password) throw new ApiError(400, "gsLoginId and password are required");

  const user = await prisma.organisation.findUnique({ where: { gsLoginId } });
  if (!user) throw new ApiError(404, "Invalid gsLoginId");

  if (user.registrationStatus !== "ACCEPTED") throw new ApiError(403, "Account pending admin approval");

  const isMatched = await AuthService.comparePassword(password, user.password || "");
  if (!isMatched) throw new ApiError(401, "Invalid password");

  const { accessToken, refreshToken } = AuthService.generateTokenPair(user.id, "organisation");
  await prisma.organisation.update({ where: { id: user.id }, data: { refreshToken } });

  const { password: _, refreshToken: __, ...safeUser } = user;
  const options = { httpOnly: true, secure: true };
  return res.status(200).cookie("refreshToken", refreshToken, options).cookie("accessToken", accessToken, options).json(new ApiResponse(200, safeUser, "organisation login successfull"));
});

const registerAdmin = AsyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password || !phone) throw new ApiError(400, "all fields are required");

  const existing = await prisma.admin.findFirst({ where: { OR: [{ email }, { phone }] } });
  if (existing) throw new ApiError(409, "Admin already exists");

  const hashedPassword = await AuthService.hashPassword(password);
  
  const user = await prisma.admin.create({
    data: { name, email, phone, password: hashedPassword }
  });

  const gsLoginId = generateGsLoginId("admin", user.id);
  const updatedUser = await prisma.admin.update({
    where: { id: user.id },
    data: { gsLoginId }
  });

  const { password: _, refreshToken: __, ...safeUser } = updatedUser;
  return res.status(200).json(new ApiResponse(200, safeUser, "Admin created successfully"));
});

const loginAdmin = AsyncHandler(async (req: Request, res: Response) => {
  const { gsLoginId, password } = req.body;
  if (!gsLoginId || !password) throw new ApiError(400, "gsLoginId and password are required");

  const user = await prisma.admin.findUnique({ where: { gsLoginId } });
  if (!user) throw new ApiError(404, "Invalid gsLoginId");
  if (!user.isActive) throw new ApiError(403, "Admin account is deactivated");

  const isMatched = await AuthService.comparePassword(password, user.password || "");
  if (!isMatched) throw new ApiError(401, "Invalid password");

  const { accessToken, refreshToken } = AuthService.generateTokenPair(user.id, "admin");
  await prisma.admin.update({ where: { id: user.id }, data: { refreshToken } });

  const { password: _, refreshToken: __, ...safeUser } = user;
  const options = { httpOnly: true, secure: true };
  return res.status(200).cookie("refreshToken", refreshToken, options).cookie("accessToken", accessToken, options).json(new ApiResponse(200, safeUser, "Admin login successfull"));
});

const registerSuperAdmin = AsyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password || !phone) throw new ApiError(400, "all fields are required");

  const existing = await prisma.superAdmin.findFirst();
  if (existing) throw new ApiError(403, "SuperAdmin already exists");

  const hashedPassword = await AuthService.hashPassword(password);
  
  const user = await prisma.superAdmin.create({
    data: { name, email, phone, password: hashedPassword }
  });

  const { password: _, refreshToken: __, ...safeUser } = user;
  return res.status(200).json(new ApiResponse(200, safeUser, "SuperAdmin created successfully"));
});

const loginSuperAdmin = AsyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, "email and password are required");

  const user = await prisma.superAdmin.findUnique({ where: { email } });
  if (!user) throw new ApiError(404, "Invalid credentials");

  const isMatched = await AuthService.comparePassword(password, user.password || "");
  if (!isMatched) throw new ApiError(401, "Invalid password");

  const { accessToken, refreshToken } = AuthService.generateTokenPair(user.id, "superadmin");
  await prisma.superAdmin.update({ where: { id: user.id }, data: { refreshToken } });

  const { password: _, refreshToken: __, ...safeUser } = user;
  const options = { httpOnly: true, secure: true };
  return res.status(200).cookie("refreshToken", refreshToken, options).cookie("accessToken", accessToken, options).json(new ApiResponse(200, safeUser, "SuperAdmin login successfull"));
});

const refreshAccessToken = AsyncHandler(async (req: Request, res: Response) => {
  const incomingRefreshToken = req.cookies.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, "unauthorized request");

  const decodedToken: any = jwt.verify(incomingRefreshToken, process.env.JWT_TOKEN_PRIVATE_KEY!);
  
  let user: any = null;
  const role = decodedToken.role;
  const id = decodedToken.user_id;

  if (role === "kisaan") user = await prisma.kisaan.findUnique({ where: { id } });
  else if (role === "vyapari") user = await prisma.vyapari.findUnique({ where: { id } });
  else if (role === "organisation") user = await prisma.organisation.findUnique({ where: { id } });
  else if (role === "admin") user = await prisma.admin.findUnique({ where: { id } });
  else if (role === "superadmin") user = await prisma.superAdmin.findUnique({ where: { id } });

  if (!user) throw new ApiError(401, "Invalid refresh token");
  if (incomingRefreshToken !== user.refreshToken) throw new ApiError(401, "Refresh token is expired or used");

  const { accessToken, refreshToken } = AuthService.generateTokenPair(user.id, role);

  if (role === "kisaan") await prisma.kisaan.update({ where: { id }, data: { refreshToken } });
  else if (role === "vyapari") await prisma.vyapari.update({ where: { id }, data: { refreshToken } });
  else if (role === "organisation") await prisma.organisation.update({ where: { id }, data: { refreshToken } });
  else if (role === "admin") await prisma.admin.update({ where: { id }, data: { refreshToken } });
  else if (role === "superadmin") await prisma.superAdmin.update({ where: { id }, data: { refreshToken } });

  const options = { httpOnly: true, secure: true };
  return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed"));
});

const logoutUser = AsyncHandler(async (req: Request, res: Response) => {
  const role = req.userRole;
  const id = req.user!.id;

  if (role === "kisaan") await prisma.kisaan.update({ where: { id }, data: { refreshToken: null } });
  else if (role === "vyapari") await prisma.vyapari.update({ where: { id }, data: { refreshToken: null } });
  else if (role === "organisation") await prisma.organisation.update({ where: { id }, data: { refreshToken: null } });
  else if (role === "admin") await prisma.admin.update({ where: { id }, data: { refreshToken: null } });
  else if (role === "superadmin") await prisma.superAdmin.update({ where: { id }, data: { refreshToken: null } });

  const options = { httpOnly: true, secure: true };
  return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User logged out"));
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
  registerAdmin,
  loginAdmin,
  registerSuperAdmin,
  loginSuperAdmin,
  refreshAccessToken,
  logoutUser
};
