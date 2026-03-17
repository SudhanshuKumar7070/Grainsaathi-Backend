import { Router } from "express";
import {
  add_crop,
  removeCrop,
  getListedCrop,
  updateCropPrice,
} from "../Controller/trader.controller.js";
import { verifyJwt } from "../Middleware/auth.middleware.js";
import { rateLimiter } from "../Middleware/otpRateLimiter.middleware.js";

const router = Router();

router.route("/add_crop").post(verifyJwt, rateLimiter, add_crop);
router.route("/remove_crop/:cropId").post(verifyJwt, rateLimiter, removeCrop);
router.route("/get_listed_crop").get(verifyJwt, rateLimiter, getListedCrop);
router
  .route("/update_crop_price")
  .post(verifyJwt, rateLimiter, updateCropPrice);

export default router;
