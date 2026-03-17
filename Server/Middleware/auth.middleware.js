import jwt from "jsonwebtoken";
import { AsyncHandler } from "../utils/AsynHandler.js";
import ApiError from "../utils/ApiError.js";
import prisma from "../lib/prisma.js";

// aim - verify user token, get user and set it to req.user

const verifyJwt = AsyncHandler(async (req, res, next) => {
  const accessToken = req.cookies?.accessToken;
  if (!accessToken)
    throw new ApiError(
      402,
      "access tokens are not available, need to login first",
    );

  const decodedData = jwt.verify(
    accessToken,
    process.env.JWT_TOKEN_PRIVATE_KEY,
  );
  const current_id = decodedData?.user_id;
  const role = decodedData?.role;

  let user;
  if (role === "vyapari") {
    user = await prisma.vyapari.findUnique({ where: { id: current_id } });
  } else if (role === "kisaan") {
    user = await prisma.kisaan.findUnique({ where: { id: current_id } });
  } else if (role === "organisation") {
    user = await prisma.organisation.findUnique({ where: { id: current_id } });
  }

  if (!user) throw new ApiError(402, "invalid user, you need to login first");
  req.user = user;
  req.userRole = role;
  next();
});

export { verifyJwt };
