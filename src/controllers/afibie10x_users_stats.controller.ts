import { Request, Response } from "express";
import { Afibie10xUserStatsService } from "../services/afibie10x_users_stats.service";

export const Afibie10xUserStatsController = {
  getStats: async (req: Request, res: Response): Promise<any> => {
    try {
      const stats = await Afibie10xUserStatsService.getStats();
      res.status(200).json(stats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  },
};
