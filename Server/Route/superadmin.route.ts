import { Router } from "express";
import { validate } from "../Validators/index.js";
import { verifyJwt } from "../Middleware/auth.middleware.js";
import { authorizeRoles } from "../Middleware/rbac.middleware.js";
import { createAdminSchema } from "../Validators/auth.validator.js";
import { registerAdmin, registerSuperAdmin } from "../Controller/user.controller.js";

const router = Router();

router.use(verifyJwt);

// Currently allowing superadmin to create admins
router.route("/admin/create").post(authorizeRoles("superadmin"), validate(createAdminSchema), registerAdmin);

// Seed route for creating the first superadmin (can be disabled in production)
router.route("/create").post(validate(createAdminSchema), registerSuperAdmin);

export default router;
