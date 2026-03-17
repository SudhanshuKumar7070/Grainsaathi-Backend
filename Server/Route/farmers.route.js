import Router from "express"
import {getCropsOnDistance} from "../Controller/crops.controller.js"
import { rateLimiter } from "../Middleware/otpRateLimiter.middleware.js";
import { verifyJwt } from "../Middleware/auth.middleware.js";
const router = Router();
 router.route("/get_crops/:cropName").get(rateLimiter,verifyJwt,getCropsOnDistance);


export  default router;
