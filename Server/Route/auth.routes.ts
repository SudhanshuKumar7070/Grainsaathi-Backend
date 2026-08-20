import { Router } from "express";
import { rateLimiter } from "../Middleware/otpRateLimiter.middleware.js";
import { validate } from "../Validators/index.js";
import { verifyJwt } from "../Middleware/auth.middleware.js";
import { 
  registerKisaanSchema, 
  loginKisaanSchema, 
  sendOtpSchema, 
  verifyOtpSchema, 
  registerVyapariSchema, 
  registerOrganisationSchema,
  gsLoginSchema,
  superAdminLoginSchema
} from "../Validators/auth.validator.js";
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
  loginAdmin,
  loginSuperAdmin,
  refreshAccessToken,
  logoutUser
} from "../Controller/user.controller.js";

const router = Router();

router.route("/send_login_otp").post(rateLimiter, validate(sendOtpSchema), send_login_otp);
router.route("/verify_login_otp").post(rateLimiter, validate(verifyOtpSchema), verifyLoginOtp);
router.route("/verify_register_otp").post(rateLimiter, validate(verifyOtpSchema), verifyRegisterOtp);
router.route("/send_register_otp").post(rateLimiter, validate(sendOtpSchema), send_register_otp);

router.route("/register_kisaan").post(validate(registerKisaanSchema), registerKisaan);
router.route("/login_kisaan").post(validate(loginKisaanSchema), loginKisaan);

router.route("/register_vyapari").post(rateLimiter, validate(registerVyapariSchema), registerVyapari);
router.route("/login_vyapari").post(validate(gsLoginSchema), loginVyapari);

router.route("/register_company").post(validate(registerOrganisationSchema), registerCompany);
router.route("/login_company").post(validate(gsLoginSchema), companyLogin);

router.route("/admin/login").post(validate(gsLoginSchema), loginAdmin);
router.route("/superadmin/login").post(validate(superAdminLoginSchema), loginSuperAdmin);

router.route("/refresh_token").post(refreshAccessToken);
router.route("/logout").post(verifyJwt, logoutUser);

export default router;
