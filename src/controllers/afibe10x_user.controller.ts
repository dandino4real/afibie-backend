import { Request, Response } from "express";
import { Afibe10XUserService } from "../services/afibe10x_user.service";

export const Afibe10XUserController = {
  getUsers: async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await Afibe10XUserService.fetchUsers(req.query);
      return res.json(data);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  },

  approveUser: async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const admin = (req as any).admin;

      const result = await Afibe10XUserService.approveUser(id, {
        name: admin.name,
        email: admin.email,
      });
      res.status(200).json({ message: "User approved", data: result });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  rejectUser: async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const admin = (req as any).admin;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return res
          .status(400)
          .json({ message: "Rejection reason is required" });
      }

      const result = await Afibe10XUserService.rejectUser(
        id,
        {
          name: admin.name,
          email: admin.email,
        },
        rejectionReason,
      );

      res.status(200).json({ message: "User rejected", data: result });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  deleteUser: async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const deleted = await Afibe10XUserService.deleteUserById(id);
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
  markMessagesAsSeen: async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;

      await Afibe10XUserService.markMessagesAsSeen(id);

      return res.status(200).json({ message: "Messages marked as read" });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  },
};
