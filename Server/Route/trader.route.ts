import { Router } from "express";
import {
  add_crop,
  removeCrop,
  getListedCrop,
  updateCropPrice,
} from "../Controller/trader.controller.js";
import { verifyJwt } from "../Middleware/auth.middleware.js";

const router = Router();

router.route("/add_crop").post(verifyJwt, add_crop);
router.route("/remove_crop/:cropId").post(verifyJwt, removeCrop);
router.route("/get_listed_crop").get(verifyJwt, getListedCrop);
router.route("/update_crop_price").post(verifyJwt, updateCropPrice);

export default router;
