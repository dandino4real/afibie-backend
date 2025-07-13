import { Request, Response } from "express";
import { UserStatsService } from "../services/users_stats.service";

export const UserStatsController = {
  getStats: async (req: Request, res: Response): Promise<any> => {
    try {
      const stats = await UserStatsService.getStats();
      res.status(200).json(stats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  },
};
