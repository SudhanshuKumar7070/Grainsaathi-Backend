import { Router } from "express";
import {
  add_crop,
  removeCrop,
  getListedCrop,
  updateCropPrice,
} from "../Controller/trader.controller.js";
import { verifyJwt } from "../Middleware/auth.middleware.js";
import { validate } from "../Validators/index.js";
import { addCropSchema, removeCropSchema, updateCropPriceSchema } from "../Validators/crop.validator.js";

const router = Router();

router.route("/add_crop").post(verifyJwt, validate(addCropSchema), add_crop);
router.route("/remove_crop/:cropId").post(verifyJwt, validate(removeCropSchema), removeCrop);
router.route("/get_listed_crop").get(verifyJwt, getListedCrop);
router.route("/update_crop_price").post(verifyJwt, validate(updateCropPriceSchema), updateCropPrice);

export default router;
