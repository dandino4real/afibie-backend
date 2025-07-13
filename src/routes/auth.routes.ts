import express from "express";
import { AuthController } from "../controllers/auth.controller";

const router = express.Router();

router.post("/login", AuthController.login);
router.post("/refresh-token", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.post("/verify-otp", AuthController.verifyOtp);

export default router;
