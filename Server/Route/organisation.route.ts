import { Router } from "express";
import { verifyJwt } from "../Middleware/auth.middleware.js";
import { add_crop } from "../Controller/trader.controller.js";

const router = Router();

router.route("/add_crop").post(verifyJwt, add_crop);

export default router;
