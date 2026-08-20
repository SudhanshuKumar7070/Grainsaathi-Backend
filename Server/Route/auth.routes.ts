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
  loginVyapari,
  registerCompany,
  companyLogin,
} from "../Controller/user.controller.js";

const router = Router();

router.route("/send_login_otp").post(rateLimiter, send_login_otp);
router.route("/verify_login_otp").post(rateLimiter, verifyLoginOtp);
router.route("/verify_register_otp").post(rateLimiter, verifyRegisterOtp);
router.route("/send_register_otp").post(rateLimiter, send_register_otp);
router.route("/register_kisaan").post(registerKisaan);
router.route("/login_kisaan").post(loginKisaan);
router.route("/register_vyapari").post(rateLimiter, registerVyapari);
router.route("/login_vyapari").post(loginVyapari);
router.route("/register_company").post(registerCompany);
router.route("/login_company").post(companyLogin);

export default router;
