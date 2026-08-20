import { Router } from "express";
import { verifyJwt } from "../Middleware/auth.middleware.js";
import { validate } from "../Validators/index.js";
import {
  createContractSchema,
  contractActionSchema,
  cancelContractSchema,
  sellContractParamSchema,
  getContractsQuerySchema,
} from "../Validators/contract.validator.js";
import {
  createContractController,
  acceptContractController,
  rejectContractController,
  cancelContractController,
  getSellContractDetailsController,
  completeContractController,
  getSellContractsController,
  getIncomingContractsController,
  getSentContractsController,
} from "../Controller/contract.controller.js";

const router = Router();

router.use(verifyJwt);

router.post("/create", validate(createContractSchema), createContractController);
router.get("/incoming", validate(getContractsQuerySchema), getIncomingContractsController);
router.get("/sent", validate(getContractsQuerySchema), getSentContractsController);
router.post("/:id/accept", validate(contractActionSchema), acceptContractController);
router.post("/:id/reject", validate(contractActionSchema), rejectContractController);
router.post("/:id/cancel", validate(cancelContractSchema), cancelContractController);

router.get("/sell", validate(getContractsQuerySchema), getSellContractsController);
router.get("/sell/:id", validate(sellContractParamSchema), getSellContractDetailsController);
router.post("/sell/:id/complete", validate(sellContractParamSchema), completeContractController);

export default router;
