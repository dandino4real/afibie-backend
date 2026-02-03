import express from "express";
import { authenticateAdmin } from "../middlewares/auth.middleware";
import { Afibie10xUserStatsController } from "../controllers/afibie10x_users_stats.controller";

const router = express.Router();

router.get("/afibie10x/stats", authenticateAdmin, Afibie10xUserStatsController.getStats);

export default router;
