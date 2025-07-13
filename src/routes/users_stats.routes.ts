import express from "express";
import { UserStatsController } from "../controllers/users_stats.controller";
import { authenticateAdmin } from "../middlewares/auth.middleware";

const router = express.Router();

router.get("/stats", authenticateAdmin, UserStatsController.getStats);

export default router;
