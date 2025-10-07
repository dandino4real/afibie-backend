import express from "express";
import {
  authenticateAdmin,
  authorizePermission,
} from "../middlewares/auth.middleware";
import { ForexUserController } from "../controllers/forex_new_user.controller";

const router = express.Router();


router.get(
  "/",
  authenticateAdmin,
  ForexUserController.getAllForexUsers
);

router.put(
  "/loginid/:id/approve",
  authenticateAdmin,
  authorizePermission("approve_registration"),
  ForexUserController.approveLoginId
);

router.put(
  "/loginid/:id/reject",
  authenticateAdmin,
  authorizePermission("approve_registration"),
  ForexUserController.rejectLoginId
);

// ===============================
// ACCOUNT SCREENSHOT
// ===============================
router.put(
  "/account-screenshot/:id/approve",
  authenticateAdmin,
  authorizePermission("approve_registration"),
  ForexUserController.approveAccountScreenshot
);

router.put(
  "/account-screenshot/:id/reject",
  authenticateAdmin,
  authorizePermission("approve_registration"),
  ForexUserController.rejectAccountScreenshot
);

// ===============================
// TEST TRADES SCREENSHOT
// ===============================
router.put(
  "/testtrades-screenshot/:id/approve",
  authenticateAdmin,
  authorizePermission("approve_registration"),
  ForexUserController.approveTestTradesScreenshot
);

router.put(
  "/testtrades-screenshot/:id/reject",
  authenticateAdmin,
  authorizePermission("approve_registration"),
  ForexUserController.rejectTestTradesScreenshot
);

router.delete(
  "/:id",
  authenticateAdmin,
  authorizePermission("delete_user"),
  ForexUserController.deleteForexUser
);


export default router;
