import { Router } from "express";
import { validate } from "../Validators/index.js";
import { verifyJwt } from "../Middleware/auth.middleware.js";
import { authorizeRoles } from "../Middleware/rbac.middleware.js";
import { createAdminSchema, deactivateAdminSchema } from "../Validators/superadmin.validator.js";
import {
  createAdmin,
  deactivateAdmin,
  listAdmins,
  getAnalytics
} from "../Controller/superadmin.controller.js";

const router = Router();

// Secure all superadmin routes
router.use(verifyJwt, authorizeRoles("superadmin"));

router.route("/admin/create").post(validate(createAdminSchema), createAdmin);
router.route("/admin/:id/deactivate").post(validate(deactivateAdminSchema), deactivateAdmin);
router.route("/admins").get(listAdmins);
router.route("/analytics").get(getAnalytics);

export default router;
