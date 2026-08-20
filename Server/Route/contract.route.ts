import { Router } from "express";
import { verifyJwt } from "../Middleware/auth.middleware.js";
import { validate } from "../Validators/index.js";
import {
  createContractSchema,
  acceptContractSchema,
  rejectContractSchema,
} from "../Validators/contract.validator.js";
import {
  createContractController,
  acceptContractController,
  rejectContractController,
  getIncomingContractsController,
  getSentContractsController,
} from "../Controller/contract.controller.js";

const router = Router();

router.use(verifyJwt);

router.post("/create", validate(createContractSchema), createContractController);
router.post("/:id/accept", validate(acceptContractSchema), acceptContractController);
router.post("/:id/reject", validate(rejectContractSchema), rejectContractController);
router.get("/incoming", getIncomingContractsController);
router.get("/sent", getSentContractsController);

export default router;
