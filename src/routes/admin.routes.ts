import express from "express";
import { AdminController } from "../controllers/admin.controller";
import { authenticateAdmin } from "../middlewares/auth.middleware";
import { authorizeSuperadmin } from "../middlewares/authorize.middleware";

const router = express.Router();

router.post("/create", authenticateAdmin, authorizeSuperadmin, AdminController.createAdmin);
router.patch("/edit/:id", authenticateAdmin, authorizeSuperadmin, AdminController.editAdmin);
router.delete("/delete/:id", authenticateAdmin, authorizeSuperadmin, AdminController.deleteAdmin);
router.get("/all", authenticateAdmin, authorizeSuperadmin, AdminController.fetchAdmins);
router.get("/stats", authenticateAdmin, authorizeSuperadmin, AdminController.getAdminStats);
router.get("/:id", authenticateAdmin,  authorizeSuperadmin, AdminController.getAdminById);
router.get("/profile/:id", authenticateAdmin, AdminController.getAdminById);
router.patch("/profile/:id", authenticateAdmin, AdminController.updateProfile);

export default router;
