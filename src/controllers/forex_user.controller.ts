// src/controllers/forexUser.controller.ts
import { Request, Response } from "express";
import { ForexUserService } from "../services/forex_user.service";

export const ForexUserController = {
  getForexUsers: async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await ForexUserService.getForexUsers(req.query);
      return res.status(200).json({
        message: "Forex users fetched successfully",
        ...data,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Server error" });
    }
  },
  approveForexUser: async (req: Request, res: Response) : Promise<any> => {
      try {
        const { id } = req.params;
        const admin = (req as any).admin;
        const result = await ForexUserService.approveUser(id, {
          name: admin.name,
          email: admin.email,
        });
        res.status(200).json({ message: "User approved", data: result });
      } catch (err: any) {
        res.status(400).json({ message: err.message });
      }
    },
  
 rejectForexUser: async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const admin = (req as any).admin;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      if (!["no_affiliate_link", "insufficient_deposit"].includes(rejectionReason)) {
        return res.status(400).json({ message: "Invalid rejection reason" });
      }

      const result = await ForexUserService.rejectUser(id, {
        name: admin.name,
        email: admin.email,
      }, rejectionReason);
      res.status(200).json({ message: "User rejected", data: result });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },
  
     deleteUser: async (req: Request, res: Response): Promise<any> => {
      try {
        const { id } = req.params;
        const deleted = await ForexUserService.deleteUserById(id);
        return res.status(200).json({
          message: "User deleted successfully",
          user: deleted,
        });
      } catch (err: any) {
        return res.status(400).json({
          message: err.message || "Failed to delete user",
        });
      }
    },
};
