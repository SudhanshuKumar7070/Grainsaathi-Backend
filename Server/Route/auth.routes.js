import { Router } from "express";
import { rateLimiter } from "../Middleware/otpRateLimiter.middleware.js";
import {
  loginKisaan,
  registerKisaan,
  send_login_otp,
  send_register_otp,
  verifyLoginOtp,
  verifyRegisterOtp,
  registerVyapari,
} from "../Controller/user.controller.js";
const router = Router();

router.route("/auth/send_login_otp").post(rateLimiter, send_login_otp);
router.route("/auth/verify_login_otp").post(rateLimiter, verifyLoginOtp);
router.route("/auth/verify_register_otp").post(rateLimiter, verifyRegisterOtp);
router.route("/auth/send_register_otp").post(rateLimiter, send_register_otp);
router.route("/auth/register_kisaan").post(registerKisaan);
router.route("/auth/login_kisaan").post(loginKisaan);
router.route("/auth/register_vyapari").post(rateLimiter, registerVyapari);
export default router;

