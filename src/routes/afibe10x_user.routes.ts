import { Router } from "express";
import { Afibe10XUserController } from "../controllers/afibe10x_user.controller";
import {
  authenticateAdmin,
  authorizePermission,
} from "../middlewares/auth.middleware";

const router = Router();

router.get("/afibe10x", authenticateAdmin, Afibe10XUserController.getUsers);

router.patch(
  "/afibe10x/:id/approve",
  authenticateAdmin,
  authorizePermission("approve_registration"),
  Afibe10XUserController.approveUser,
);

router.patch(
  "/afibe10x/:id/reject",
  authenticateAdmin,
  authorizePermission("reject_registration"),
  Afibe10XUserController.rejectUser,
);

router.delete(
  "/afibe10x/:id",
  authenticateAdmin,
  authorizePermission("delete_users"),
  Afibe10XUserController.deleteUser,
);

router.patch(
  "/afibe10x/:id/mark-seen",
  authenticateAdmin,
  Afibe10XUserController.markMessagesAsSeen,
);

export default router;
