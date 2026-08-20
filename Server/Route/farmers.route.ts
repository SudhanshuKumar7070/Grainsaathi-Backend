import { Router } from "express";
import { getCropsOnDistance } from "../Controller/crops.controller.js";
import { verifyJwt } from "../Middleware/auth.middleware.js";

const router = Router();

router.route("/get_crops/:cropName").get(verifyJwt, getCropsOnDistance);

export default router;
