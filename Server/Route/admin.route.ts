import { Router } from "express";
import { verifyJwt } from "../Middleware/auth.middleware.js";
import { authorizeRoles } from "../Middleware/rbac.middleware.js";
import { validate } from "../Validators/index.js";
import {
  approveRegistrationSchema,
  rejectRegistrationSchema,
  banUserSchema,
  moderatePostSchema
} from "../Validators/admin.validator.js";
import {
  getTickets,
  getTicketById,
  approveRegistration,
  rejectRegistration,
  banUser,
  unbanUser,
  moderatePost
} from "../Controller/admin.controller.js";

const router = Router();

// Apply auth and RBAC middleware to all admin routes
router.use(verifyJwt, authorizeRoles("admin", "superadmin"));

router.route("/tickets").get(getTickets);
router.route("/tickets/:id").get(getTicketById);
router.route("/tickets/:id/approve").post(validate(approveRegistrationSchema), approveRegistration);
router.route("/tickets/:id/reject").post(validate(rejectRegistrationSchema), rejectRegistration);

router.route("/users/:id/ban").post(validate(banUserSchema), banUser);
router.route("/users/:id/unban").post(validate(banUserSchema), unbanUser);

router.route("/posts/:id/moderate").post(validate(moderatePostSchema), moderatePost);

export default router;
