import { Router } from "express";
import { verifyJwt } from "../Middleware/auth.middleware.js";
import { authorizeRoles } from "../Middleware/rbac.middleware.js";
import { addOrgCrop, getListedOrgCrop, removeOrgCrop, updateOrgCropPrice } from "../Controller/organisation.controller.js";
import { validate } from "../Validators/index.js";
import { addCropSchema, removeCropSchema, updateCropPriceSchema } from "../Validators/crop.validator.js";

const router = Router();

router.use(verifyJwt, authorizeRoles("organisation"));

router.route("/add_crop").post(validate(addCropSchema), addOrgCrop);
router.route("/remove_crop/:cropId").delete(validate(removeCropSchema), removeOrgCrop);
router.route("/get_listed_crop").get(getListedOrgCrop);
router.route("/update_crop_price/:cropId").patch(validate(updateCropPriceSchema), updateOrgCropPrice);

export default router;
