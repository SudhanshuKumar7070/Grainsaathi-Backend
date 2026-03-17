import client from "../Config/twilio.config.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { AsyncHandler } from "../utils/AsynHandler.js";
import { generateOTP } from "../utils/otpGenarator.js";
import redisClient from "../Config/redis.config.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
console.log("ENGINE =", process.env.PRISMA_CLIENT_ENGINE_TYPE);
const twilio_service_id = process.env.TWILIO_SERVICE_SID;

console.log("getting service id", twilio_service_id);

const sendOtpMessage = async (to, body) => {
  try {
    const response = await client.messages.create({
      from: process.env.FROM_PHONE_NUMBER,
      body: body,
      to: to,
    });
    console.log("response of twilio otp sender :", response);

    return response;
  } catch (err) {
    console.log("error occured in sending message, twilio error :", err);
    return false;
  }
};

const sendOtp = async (phoneNumber) => {
  const otp = generateOTP();

  const hashedOtp = await bcrypt.hash(otp.toString(), 10);

  await redisClient.hset(
    `phoneNumber:${phoneNumber}`,
    "hash",
    hashedOtp,
    "attempts",
    0,
  );

  await redisClient.expire(`phoneNumber:${phoneNumber}`, 300);

  // the otp provider will be integrated here-----------===========-----------
  const sampleBody = `Your OTP is ${otp}. Valid for 5 minutes.`;
  // const sampleBody ="kya re gandwe shiv kumar!!! shiv laad"
  const is_otp_sent = await sendOtpMessage(phoneNumber, sampleBody); // for testing purpose only
  if (!is_otp_sent) throw new ApiError(500, "failed to send otp");

  return { message: "success" };
};

const send_register_otp = AsyncHandler(async (req, res) => {
  const phoneNumber = req.body.phoneNumber;
  if (!phoneNumber) throw new ApiError(400, "missing phone number");

  const user = await prisma.kisaan.findUnique({
    where: { phone: phoneNumber },
  });

  if (user) throw new ApiError(500, "user already exists");

  const is_otp_sent = await sendOtp(phoneNumber);
  if (!is_otp_sent)
    throw new ApiError(500, "something went wrong in sending otp");

  return res
    .status(200)
    .json(new ApiResponse(200, null, "otp sent successfully"));
});

const send_login_otp = AsyncHandler(async (req, res) => {
  const phoneNumber = req.body.phoneNumber;
  if (!phoneNumber) throw new ApiError(400, "missing phone number");

  const user = await prisma.kisaan.findUnique({
    where: { phone: phoneNumber },
  });

  if (!user)
    throw new ApiError(402, "user not registered ,need to register first");

  const is_otp_sent = await sendOtp(phoneNumber);
  if (!is_otp_sent)
    throw new ApiError(500, "something went wrong in sending otp");

  return res
    .status(200)
    .json(new ApiResponse(200, null, "otp sent successfully"));
});
const verifyLoginOtp = AsyncHandler(async (req, res) => {
  const private_key = process.env.JWT_PRIVATE_KEY;

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

// we need to be quite repetitive here ,

const verifyRegisterOtp = AsyncHandler(async (req, res) => {
  const private_key = process.env.JWT_PRIVATE_KEY;

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
      new ApiResponse(200, token, "otp for registration verified successfully"),
    );
});

// kisam registration
const registerKisaan = AsyncHandler(async (req, res) => {
  console.log("Entering registerKisan controller");
  const { kisanName, email, password, userAddress } = req.body;
  const userLocation = req.query;

  console.log("Request Body:", { kisanName, email, userAddress });
  console.log("User Location (query):", userLocation);

  if (!userLocation || !userLocation.lat || !userLocation.long) {
    console.log("Error: User location missing");
    throw new ApiError(403, "user location is not available at the moment");
  }

  const lat = Number(userLocation.lat);
  const long = Number(userLocation.long);

  if (
    [kisanName, email, password, userAddress].some((el) => !el || !el.trim())
  ) {
    console.log("Error: Missing required fields");
    throw new ApiError(402, "all fields are required in register kisan api");
  }

  console.log("Authorization Header:", req.headers.authorization);

  if (!req.headers.authorization) {
    console.log("Error: Authorization header missing");
    throw new ApiError(
      402,
      "authorization header is missing from request header in register kisan api",
    );
  }

  const tokenParts = req.headers.authorization.split(" ");
  const token = tokenParts.length > 1 ? tokenParts[1] : tokenParts[0];
  console.log("Extracted Token:", token);

  if (!token) {
    console.log("Error: Token extracted as empty");
    throw new ApiError(
      400,
      "token is missing from request header in register kisan api",
    );
  }

  let decodedToken;
  console.log("check token before try block =>", token);
  try {
    console.log("check token inside try block =>", token);
    decodedToken = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
    console.log("Decoded Token:", decodedToken);
  } catch (err) {
    console.log("Error: JWT Verification failed", err);
    throw new ApiError(401, "Invalid or expired token");
  }

  if (decodedToken.purpose !== "REGISTER") {
    console.log("Error: Invalid token purpose", decodedToken.purpose);
    throw new ApiError(400, "invalid purpose in token in register kisan api");
  }

  const { phoneNumber } = decodedToken;
  console.log("Registering for phone number:", phoneNumber);

  const isExistingUser = await prisma.kisaan.findUnique({
    where: { phone: phoneNumber },
  });

  if (isExistingUser) {
    console.log("Error: User already exists");
    throw new ApiError(400, "user already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  console.log("Password hashed successfully");

  console.log("Attempting to create kisan in DB with data:", {
    name: kisanName,
    email,
    phone: phoneNumber,
    lat,
    long,
  });

  const kisanUser = await prisma.kisaan.create({
    data: {
      name: kisanName,
      email,
      password: hashedPassword,
      phone: phoneNumber,
      address: userAddress,
      lat: lat,
      long: long,
    },
  });

  if (!kisanUser) {
    console.log("Error: Database creation failed");
    throw new ApiError(
      500,
      "something went wrong in register kisan api , kisan user not created",
    );
  }

  console.log("Kisan registered successfully:", kisanUser.id);

  return res
    .status(200)
    .json(new ApiResponse(200, kisanUser, "kisan registered successfully"));
});

// <------------kisaan login------->------------->---------->----------->

const loginKisaan = AsyncHandler(async (req, res) => {
  if (!req.headers.authorization)
    throw new ApiError(401, "authorisation is missing from header");

  const verified_otp_token = req.headers.authorization.split(" ")[1];
  if (!verified_otp_token)
    throw new ApiError(401, "otp authorisation token is not available");

  const decoded = jwt.verify(verified_otp_token, process.env.JWT_PRIVATE_KEY);

  if (!decoded) throw new ApiError(402, "invalid user");

  if (decoded.purpose !== "LOGIN")
    throw new ApiError(403, "Invalid OTP token purpose");

  const phoneNumber = decoded.phoneNumber;

  const user_for_id = await prisma.kisaan.findUnique({
    where: { phone: phoneNumber },
  });

  if (!user_for_id) throw new ApiError(404, "user not exist with phone number");

  const user_id = user_for_id.id;

  const refreshToken = jwt.sign(
    { user_id, role: "kisaan" },
    process.env.JWT_TOKEN_PRIVATE_KEY,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );

  const accessToken = jwt.sign(
    { user_id, role: "kisaan" },
    process.env.JWT_TOKEN_PRIVATE_KEY,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );

  const setRefreshTokenToDB = await prisma.kisaan.update({
    where: { phone: phoneNumber },
    data: { refreshToken },
  });

  if (!setRefreshTokenToDB)
    throw new ApiError(500, "error in setting refresh token in db");

  const user = await prisma.kisaan.findUnique({
    where: { phone: phoneNumber },
  });

  if (!user) throw new ApiError(404, "user not exist with phone number");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200, user, "user login successfull"));
});
// register traders

const registerVyapari = AsyncHandler(async (req, res) => {
  const { name, email, address, password, gstNumber } = req.body;
  if ([name, email, address, password].some((el) => !el.trim()))
    throw new ApiError(403, "all fields are required  ");
  if (!req.headers.authorization)
    throw new ApiError(402, "authorisation is missings from header");
  const authToken = req.headers?.authorization.split(" ")[0];
  if (!authToken)
    throw new ApiError(400, "auth token is not available in headers");
  const decodedToken = jwt.verify(authToken, process.env.JWT_PRIVATE_KEY);
  if (!decodedToken) throw new ApiError(402, "token not verified");
  const purpose = decodedToken.purpose;
  if (purpose !== "REGISTER") throw new ApiError(400, "invlaid token purpose");
  const phoneNumber = decodedToken.phoneNumber;
  const isExistingUser = await prisma.vyapari.findUnique({
    where: { phone: phoneNumber },
  });
  if (isExistingUser) throw new ApiError(500, "user already exists");
  const hashedPassword = await bcrypt.hash(password, 10);
  const userLocation = req.query;
  if (!userLocation || !userLocation.lat || !userLocation.long)
    throw new ApiError(403, "user location is not available");
  const lat = Number(userLocation.lat);
  const long = Number(userLocation.long);
  const user = await prisma.vyapari.create({
    data: {
      name: name,
      email: email,
      password: hashedPassword,
      phone: phoneNumber,
      address: address,
      lat: lat,
      long: long,
      gstNumber: gstNumber ? gstNumber : null,
    },
  });
  if (!user) {
    throw new ApiError(400, "error in creating vyapari user");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "user creation success "));
});

// login vyapari
const loginVyapari = AsyncHandler(async (req, res) => {
  if (!req.headers.authorization)
    throw new ApiError(401, "authorisation is missing from header");

  const verified_otp_token = req.headers.authorization.split(" ")[0];
  if (!verified_otp_token)
    throw new ApiError(401, "otp authorisation token is not available");

  const decoded = jwt.verify(verified_otp_token, process.env.JWT_PRIVATE_KEY);

  if (!decoded) throw new ApiError(402, "invalid user");

  if (decoded.purpose !== "LOGIN")
    throw new ApiError(403, "Invalid OTP token purpose");

  const phoneNumber = decoded.phoneNumber;

  const user_for_id = await prisma.vyapari.findUnique({
    where: { phone: phoneNumber },
  });

  if (!user_for_id) throw new ApiError(404, "user not exist with phone number");

  const user_id = user_for_id.id;

  const refreshToken = jwt.sign(
    { user_id, role: "vyapari" },
    process.env.JWT_TOKEN_PRIVATE_KEY,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );

  const accessToken = jwt.sign(
    { user_id, role: "vyapari" },
    process.env.JWT_TOKEN_PRIVATE_KEY,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );

  const setRefreshTokenToDB = await prisma.vyapari.update({
    where: { phone: phoneNumber },
    data: { refreshToken },
  });

  if (!setRefreshTokenToDB)
    throw new ApiError(500, "error in setting refresh token in db");

  const user = await prisma.vyapari.findUnique({
    where: { phone: phoneNumber },
  });

  if (!user) throw new ApiError(404, "user not exist with phonenumber");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200, user, "user login successfull"));
});
// register company.
const registerCompany = AsyncHandler(async (req, res) => {
  const { name, email, password, address, gstNumber } = req.body;
  if ([name, email, password, address, gstNumber].some((el) => !el.trim()))
    throw new ApiError(404, "all fields are  required");

  if (!req.headers.authorization)
    throw new ApiError(400, "authoisation header is not available");
  const decodedToken = jwt.verify(
    req.headers.authorization.split(" ")[0],
    process.env.JWT_PRIVATE_KEY,
  );
  if (!decodedToken) throw new ApiError(402, "invaid jwt token ");
  if (decodedToken.purpose !== "REGISTER")
    throw new ApiError(402, "invalid token puropose");
  const phoneNumber = decodedToken.phoneNumber;
  const userLocation = req.query;
  if (!userLocation || !userLocation.lat || !userLocation.long)
    throw new ApiError(403, "user location is not available");
  const lat = Number(userLocation.lat);
  const long = Number(userLocation.long);
  const isUserExists = await prisma.organisation.findUnique({
    where: {
      phone: phoneNumber,
    },
  });

  if (isUserExists) throw new ApiError(404, "user already exists");
  // creating user
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.organisation.create({
    data: {
      name: name,
      phone: phoneNumber,
      email: email,
      password: hashedPassword,
      address: address,
      lat: lat,
      long: long,
      gstNumber: gstNumber,
    },
  });

  if (!user) throw new ApiError(400, "error in creating user");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "user created succesfully"));
});
// this will check password also --
const companyLogin = AsyncHandler(async (req, res) => {
  const password = req.body.password;
  if (!password) throw new ApiError(400, "password required");
  if (!req.headers.authorization)
    throw new ApiError(404, "authorisation token not exists in header");
  const decodedToken = jwt.verify(
    req.headers.authorization.split(" ")[0],
    process.env.JWT_PRIVATE_KEY,
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
    throw new ApiError(402, "user not exists you need to register first");
  const is_password_matched = await bcrypt.compare(
    password,
    isUserExists?.password,
  );
  if (!is_password_matched) throw new ApiError(404, "invalid password");
  const user_id = isUserExists.id;
  const refreshToken = jwt.sign(
    { user_id, role: "organisation" },
    process.env.JWT_TOKEN_PRIVATE_KEY,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );

  const accessToken = jwt.sign(
    { user_id, role: "organisation" },
    process.env.JWT_TOKEN_PRIVATE_KEY,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );

  const setRefreshTokenToDB = await prisma.organisation.update({
    where: { phone: phoneNumber },
    data: { refreshToken },
  });

  if (!setRefreshTokenToDB)
    throw new ApiError(500, "error in setting refresh token in db");

  const user = await prisma.organisation.findUnique({
    where: { phone: phoneNumber },
  });

  if (!user) throw new ApiError(404, "user not exist with phonenumber");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200, user, "user login successfull"));
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
