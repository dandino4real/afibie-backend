// src/routes/forexUser.routes.ts
import express from "express";
import { ForexUserController } from "../controllers/forex_user.controller";
import { authenticateAdmin, authorizePermission } from "../middlewares/auth.middleware";

const router = express.Router();

router.get("/forex", authenticateAdmin, ForexUserController.getForexUsers);
router.patch(
'/forex/:id/approve',
authenticateAdmin,
authorizePermission('approve_registration'),
ForexUserController.approveForexUser
);

router.patch(
'/forex/:id/reject',
authenticateAdmin,
authorizePermission('reject_registration'),
ForexUserController.rejectForexUser
);

router.delete(
  "/forex/:id",
  authenticateAdmin,
  authorizePermission("delete_users"),
 ForexUserController.deleteUser
);

export default router;
